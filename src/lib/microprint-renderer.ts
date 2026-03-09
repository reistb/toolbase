import type { MicroprintPattern } from "./microprint-patterns";

export interface RenderOptions {
  text: string;
  textColor: string;
  backgroundColor: string;
  fontSize: number;
  density: number; // 0.1 to 2.0
  pattern: MicroprintPattern;
  width: number;
  height: number;
}

export interface TextPlacement {
  x: number;
  y: number;
  angle: number; // degrees
  scale: number;
  text: string;
}

// Simple seeded random number generator (mulberry32)
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple noise function
function noise2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = noise2d(ix, iy, seed);
  const b = noise2d(ix + 1, iy, seed);
  const c = noise2d(ix, iy + 1, seed);
  const d = noise2d(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy;
}

function fractalNoise(x: number, y: number, seed: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

// Hilbert curve generation
function hilbertD2xy(n: number, d: number): [number, number] {
  let rx: number, ry: number, s: number, t = d;
  let x = 0, y = 0;
  for (s = 1; s < n; s *= 2) {
    rx = 1 & (t / 2);
    ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      [x, y] = [y, x];
    }
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  return [x, y];
}

// Dragon curve L-system
function dragonCurve(iterations: number): Array<[number, number]> {
  let sequence = "FX";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const c of sequence) {
      if (c === "X") next += "X+YF+";
      else if (c === "Y") next += "-FX-Y";
      else next += c;
    }
    sequence = next;
  }
  const points: Array<[number, number]> = [[0, 0]];
  let x = 0, y = 0, dir = 0;
  for (const c of sequence) {
    if (c === "F") {
      x += Math.cos((dir * Math.PI) / 180);
      y += Math.sin((dir * Math.PI) / 180);
      points.push([x, y]);
    } else if (c === "+") dir += 90;
    else if (c === "-") dir -= 90;
  }
  return points;
}

// Phyllotaxis (sunflower) arrangement
function phyllotaxisPoints(count: number, scale: number, width: number, height: number): Array<[number, number, number]> {
  const goldenAngle = 137.508 * (Math.PI / 180);
  const cx = width / 2, cy = height / 2;
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i < count; i++) {
    const r = scale * Math.sqrt(i);
    const theta = i * goldenAngle;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      points.push([x, y, (theta * 180) / Math.PI]);
    }
  }
  return points;
}

export function generatePlacements(opts: RenderOptions): TextPlacement[] {
  const { pattern, width, height, density, text } = opts;
  const params = pattern.layoutParams;
  const placements: TextPlacement[] = [];
  const charWidth = opts.fontSize * 0.6;
  const lineHeight = opts.fontSize * 1.2;
  const textLen = text.length;
  const textWidth = charWidth * textLen;

  const spacingMult = 1 / density;

  switch (pattern.layout) {
    case "linear": {
      const dir = params.direction as string;
      const stagger = (params.stagger as number) || 0;
      const alternateFlip = params.alternateFlip as boolean;

      if (dir === "horizontal") {
        const rowSpacing = lineHeight * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        let rowIndex = 0;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing, rowIndex++) {
          const offset = stagger ? (rowIndex % 2 === 0 ? 0 : textWidth * stagger) : 0;
          const angle = alternateFlip && rowIndex % 2 === 1 ? 180 : 0;
          for (let x = -textWidth + offset; x < width + textWidth; x += colSpacing) {
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else {
        // vertical
        const colSpacing = textWidth * 1.1 * spacingMult;
        const rowSpacing = lineHeight * spacingMult;
        for (let x = 0; x < width + textWidth; x += colSpacing) {
          for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
            placements.push({ x, y, angle: 90, scale: 1, text });
          }
        }
      }
      break;
    }

    case "diagonal": {
      const angle = params.angle as number;
      const crosshatch = params.crosshatch as boolean;
      const rad = (angle * Math.PI) / 180;
      const rowSpacing = lineHeight * spacingMult;
      const colSpacing = textWidth * 1.1 * spacingMult;
      const diag = Math.sqrt(width * width + height * height);

      const renderDiag = (a: number) => {
        const r = (a * Math.PI) / 180;
        for (let offset = -diag; offset < diag * 2; offset += rowSpacing) {
          for (let along = -diag; along < diag * 2; along += colSpacing) {
            const cx = width / 2 + Math.cos(r) * along - Math.sin(r) * offset;
            const cy = height / 2 + Math.sin(r) * along + Math.cos(r) * offset;
            if (cx > -textWidth && cx < width + textWidth && cy > -lineHeight && cy < height + lineHeight) {
              placements.push({ x: cx, y: cy, angle: a, scale: 1, text });
            }
          }
        }
      };

      renderDiag(angle);
      if (crosshatch) renderDiag(-angle);
      break;
    }

    case "wave": {
      const amplitude = (params.amplitude as number) * density;
      const frequency = params.frequency as number;
      const phase = params.phase as number;
      const double_ = params.double as boolean;
      const alternatePhase = params.alternatePhase as boolean;
      const sawtooth = params.sawtooth as boolean;
      const square = params.square as boolean;
      const rowSpacing = lineHeight * 2 * spacingMult;
      const colSpacing = textWidth * 1.05 * spacingMult;

      const waveY = (x: number, rowPhase: number): number => {
        if (sawtooth) {
          const period = 1 / frequency;
          return amplitude * (2 * ((x / period + rowPhase / (2 * Math.PI)) % 1) - 1);
        }
        if (square) {
          return amplitude * Math.sign(Math.sin(x * frequency + rowPhase));
        }
        return amplitude * Math.sin(x * frequency + rowPhase);
      };

      let rowIndex = 0;
      for (let baseY = lineHeight * 2; baseY < height + lineHeight * 2; baseY += rowSpacing, rowIndex++) {
        const rowPhase = alternatePhase && rowIndex % 2 === 1 ? phase + Math.PI : phase;
        for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
          const y = baseY + waveY(x, rowPhase);
          placements.push({ x, y, angle: 0, scale: 1, text });
        }
        if (double_) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const y = baseY + rowSpacing / 2 + waveY(x, rowPhase + Math.PI);
            placements.push({ x, y, angle: 0, scale: 1, text });
          }
        }
      }
      break;
    }

    case "spiral": {
      const type = params.type as string;
      const cx = width / 2, cy = height / 2;
      const maxR = Math.min(width, height) * 0.48;

      if (type === "archimedean" || type === "fibonacci") {
        const spacing = (params.spacing as number) * spacingMult;
        const turns = params.turns as number;
        const double_ = params.double as boolean;
        const arms = (params.arms as number) || 1;
        const reverse = params.reverse as boolean;
        const alternateDir = params.alternateDir as boolean;
        const expandText = params.expandText as boolean;

        const renderArm = (armOffset: number) => {
          const totalAngle = turns * 2 * Math.PI;
          const stepAngle = (textWidth * 1.1) / (spacing / (2 * Math.PI));
          let prevX = cx, prevY = cy;
          for (let theta = 0.1; theta < totalAngle; theta += 0.05) {
            const r = reverse ? maxR - (theta / totalAngle) * maxR : (theta / totalAngle) * maxR;
            const a = theta + armOffset;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
            if (dist >= textWidth * 1.1 * spacingMult) {
              const angle = (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
              const finalAngle = alternateDir && Math.floor(theta / Math.PI) % 2 === 1 ? angle + 180 : angle;
              const scale = expandText ? 0.5 + (theta / totalAngle) * 0.8 : 1;
              placements.push({ x, y, angle: finalAngle, scale, text });
              prevX = x; prevY = y;
            }
          }
        };

        for (let arm = 0; arm < arms; arm++) {
          renderArm((arm / arms) * 2 * Math.PI);
        }
        if (double_) renderArm(Math.PI / arms);
      } else if (type === "logarithmic") {
        const growth = params.growth as number;
        const turns = params.turns as number;
        let prevX = cx, prevY = cy;
        for (let theta = 0.1; theta < turns * 2 * Math.PI; theta += 0.05) {
          const r = Math.exp(growth * theta) * 5;
          if (r > maxR) break;
          const x = cx + r * Math.cos(theta);
          const y = cy + r * Math.sin(theta);
          const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
          if (dist >= textWidth * 1.1 * spacingMult) {
            const angle = (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
            prevX = x; prevY = y;
          }
        }
      }
      break;
    }

    case "grid": {
      const type = params.type as string;
      const scatter = (params.scatter as number) || 0;
      const rotation = (params.rotation as number) || 0;
      const alternateAngle = (params.alternateAngle as number) || 0;
      const rng = createRng(42);
      const colSpacing = textWidth * 1.2 * spacingMult;
      const rowSpacing = lineHeight * 1.5 * spacingMult;

      if (type === "hex") {
        let rowIndex = 0;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing * 0.866, rowIndex++) {
          const xOffset = rowIndex % 2 === 0 ? 0 : colSpacing * 0.5;
          for (let x = -textWidth + xOffset; x < width + textWidth; x += colSpacing) {
            const sx = scatter ? x + (rng() - 0.5) * colSpacing * scatter : x;
            const sy = scatter ? y + (rng() - 0.5) * rowSpacing * scatter : y;
            placements.push({ x: sx, y: sy, angle: rotation, scale: 1, text });
          }
        }
      } else if (type === "diamond") {
        let rowIndex = 0;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing, rowIndex++) {
          const xOffset = rowIndex % 2 === 0 ? 0 : colSpacing * 0.5;
          for (let x = -textWidth + xOffset; x < width + textWidth; x += colSpacing) {
            placements.push({ x, y, angle: 45, scale: 1, text });
          }
        }
      } else if (type === "brick") {
        let rowIndex = 0;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing, rowIndex++) {
          const xOffset = rowIndex % 2 === 0 ? 0 : colSpacing * 0.5;
          for (let x = -textWidth + xOffset; x < width + textWidth; x += colSpacing) {
            placements.push({ x, y, angle: 0, scale: 1, text });
          }
        }
      } else if (type === "perspective") {
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          const perspScale = 0.5 + (y / height) * 0.8;
          const perspSpacing = colSpacing * perspScale;
          for (let x = -textWidth; x < width + textWidth; x += perspSpacing) {
            placements.push({ x, y, angle: 0, scale: perspScale, text });
          }
        }
      } else {
        // square, triangle, etc.
        let rowIndex = 0;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing, rowIndex++) {
          let colIndex = 0;
          for (let x = -textWidth; x < width + textWidth; x += colSpacing, colIndex++) {
            const sx = scatter ? x + (rng() - 0.5) * colSpacing * scatter : x;
            const sy = scatter ? y + (rng() - 0.5) * rowSpacing * scatter : y;
            const angle = alternateAngle && (rowIndex + colIndex) % 2 === 1 ? alternateAngle : rotation;
            placements.push({ x: sx, y: sy, angle, scale: 1, text });
          }
        }
      }
      break;
    }

    case "radial": {
      const type = params.type as string;
      const rings = params.rings as number;
      const cx = width / 2, cy = height / 2;
      const maxR = Math.min(width, height) * 0.45;

      if (type === "sunburst") {
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          const circumference = 2 * Math.PI * r;
          const count = Math.max(4, Math.floor(circumference / (textWidth * 1.2 * spacingMult)));
          for (let i = 0; i < count; i++) {
            const theta = (i / count) * 2 * Math.PI;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            const angle = (theta * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "concentric") {
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          const circumference = 2 * Math.PI * r;
          const count = Math.max(4, Math.floor(circumference / (textWidth * 1.1 * spacingMult)));
          for (let i = 0; i < count; i++) {
            const theta = (i / count) * 2 * Math.PI;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "vortex") {
        const twist = params.twist as number;
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          const circumference = 2 * Math.PI * r;
          const count = Math.max(4, Math.floor(circumference / (textWidth * 1.2 * spacingMult)));
          const twistOffset = twist * ring * Math.PI;
          for (let i = 0; i < count; i++) {
            const theta = (i / count) * 2 * Math.PI + twistOffset;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "mandala") {
        const symmetry = params.symmetry as number;
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          for (let s = 0; s < symmetry; s++) {
            const baseAngle = (s / symmetry) * 2 * Math.PI;
            const count = Math.max(1, Math.floor(r / (textWidth * 1.5 * spacingMult)));
            for (let i = 0; i < count; i++) {
              const theta = baseAngle + (i / count) * (2 * Math.PI / symmetry);
              const x = cx + r * Math.cos(theta);
              const y = cy + r * Math.sin(theta);
              const angle = (theta * 180) / Math.PI;
              placements.push({ x, y, angle, scale: 1, text });
            }
          }
        }
      } else if (type === "web") {
        const spokes = params.spokes as number;
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          for (let s = 0; s < spokes; s++) {
            const theta = (s / spokes) * 2 * Math.PI;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "flower") {
        const petals = params.petals as number;
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          const circumference = 2 * Math.PI * r;
          const count = Math.max(petals, Math.floor(circumference / (textWidth * 1.2 * spacingMult)));
          for (let i = 0; i < count; i++) {
            const theta = (i / count) * 2 * Math.PI;
            const petalR = r * (1 + 0.3 * Math.cos(petals * theta));
            const x = cx + petalR * Math.cos(theta);
            const y = cy + petalR * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else {
        // target, starburst, pinwheel, compass - default concentric
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * maxR;
          const circumference = 2 * Math.PI * r;
          const count = Math.max(4, Math.floor(circumference / (textWidth * 1.2 * spacingMult)));
          for (let i = 0; i < count; i++) {
            const theta = (i / count) * 2 * Math.PI;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      }
      break;
    }

    case "zigzag": {
      const amplitude = (params.amplitude as number) * density;
      const frequency = params.frequency as number;
      const double_ = params.double as boolean;
      const rowSpacing = lineHeight * 2 * spacingMult;
      const colSpacing = textWidth * 1.05 * spacingMult;

      const zigY = (x: number): number => {
        const period = 1 / frequency;
        const phase = (x % period) / period;
        return amplitude * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase);
      };

      let rowIndex = 0;
      for (let baseY = lineHeight * 2; baseY < height + lineHeight * 2; baseY += rowSpacing, rowIndex++) {
        for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
          const y = baseY + zigY(x);
          placements.push({ x, y, angle: 0, scale: 1, text });
        }
        if (double_) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const y = baseY + rowSpacing / 2 - zigY(x);
            placements.push({ x, y, angle: 0, scale: 1, text });
          }
        }
      }
      break;
    }

    case "circular": {
      const type = params.type as string;
      const cx = width / 2, cy = height / 2;
      const scale = (params.scale as number) || 0.4;
      const maxR = Math.min(width, height) * scale;

      const renderCurve = (points: Array<[number, number]>) => {
        let prevX = points[0][0], prevY = points[0][1];
        for (let i = 1; i < points.length; i++) {
          const [x, y] = points[i];
          const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
          if (dist >= textWidth * 1.1 * spacingMult) {
            const angle = (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
            prevX = x; prevY = y;
          }
        }
      };

      if (type === "single") {
        const count = Math.max(4, Math.floor((2 * Math.PI * maxR) / (textWidth * 1.1 * spacingMult)));
        for (let i = 0; i < count; i++) {
          const theta = (i / count) * 2 * Math.PI;
          const x = cx + maxR * Math.cos(theta);
          const y = cy + maxR * Math.sin(theta);
          const angle = (theta * 180) / Math.PI + 90;
          placements.push({ x, y, angle, scale: 1, text });
        }
      } else if (type === "nested") {
        const count = params.count as number;
        for (let c = 1; c <= count; c++) {
          const r = (c / count) * maxR;
          const num = Math.max(4, Math.floor((2 * Math.PI * r) / (textWidth * 1.1 * spacingMult)));
          for (let i = 0; i < num; i++) {
            const theta = (i / num) * 2 * Math.PI;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "figure8") {
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.02) {
          const x = cx + maxR * Math.sin(t);
          const y = cy + maxR * Math.sin(t) * Math.cos(t);
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "lemniscate") {
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.02) {
          const denom = 1 + Math.sin(t) * Math.sin(t);
          const x = cx + maxR * Math.cos(t) / denom;
          const y = cy + maxR * Math.sin(t) * Math.cos(t) / denom;
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "cardioid") {
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.02) {
          const r = maxR * (1 - Math.cos(t));
          const x = cx + r * Math.cos(t);
          const y = cy + r * Math.sin(t);
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "rose") {
        const petals = params.petals as number;
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.01) {
          const r = maxR * Math.cos(petals * t);
          const x = cx + r * Math.cos(t);
          const y = cy + r * Math.sin(t);
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "epicycloid") {
        const k = params.k as number;
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.01) {
          const x = cx + maxR * ((k + 1) * Math.cos(t) - Math.cos((k + 1) * t));
          const y = cy + maxR * ((k + 1) * Math.sin(t) - Math.sin((k + 1) * t));
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "hypotrochoid") {
        const R = params.R as number;
        const r = params.r as number;
        const d = params.d as number;
        const s = params.scale as number;
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 20 * Math.PI; t += 0.02) {
          const x = cx + ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)) * s * Math.min(width, height);
          const y = cy + ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)) * s * Math.min(width, height);
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "lissajous") {
        const a = params.a as number;
        const b = params.b as number;
        const delta = params.delta as number;
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.01) {
          const x = cx + maxR * Math.sin(a * t + delta);
          const y = cy + maxR * Math.sin(b * t);
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "trefoil") {
        const points: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI; t += 0.01) {
          const r = maxR * (2 + Math.cos(3 * t / 2)) / 3;
          const x = cx + r * Math.cos(t);
          const y = cy + r * Math.sin(t);
          points.push([x, y]);
        }
        renderCurve(points);
      } else if (type === "oval") {
        const rx = (params.radiusX as number) * Math.min(width, height);
        const ry = (params.radiusY as number) * Math.min(width, height);
        const count = Math.max(4, Math.floor((2 * Math.PI * Math.max(rx, ry)) / (textWidth * 1.1 * spacingMult)));
        for (let i = 0; i < count; i++) {
          const theta = (i / count) * 2 * Math.PI;
          const x = cx + rx * Math.cos(theta);
          const y = cy + ry * Math.sin(theta);
          const angle = (Math.atan2(ry * Math.cos(theta), -rx * Math.sin(theta)) * 180) / Math.PI;
          placements.push({ x, y, angle, scale: 1, text });
        }
      }
      break;
    }

    case "random": {
      const type = params.type as string;
      const seed = params.seed as number;
      const rng = createRng(seed);
      const colSpacing = textWidth * 1.2 * spacingMult;
      const rowSpacing = lineHeight * 1.5 * spacingMult;

      if (type === "scatter") {
        const count = Math.floor((width * height) / (colSpacing * rowSpacing * 2));
        for (let i = 0; i < count; i++) {
          const x = rng() * width;
          const y = rng() * height;
          const angle = rng() * 360;
          placements.push({ x, y, angle, scale: 1, text });
        }
      } else if (type === "perlin") {
        const noiseScale = params.scale as number;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const n = smoothNoise(x * noiseScale, y * noiseScale, seed);
            const angle = n * 360;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "flow") {
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const n = fractalNoise(x * 0.003, y * 0.003, seed, 3);
            const angle = n * 360;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "cluster") {
        const clusters = params.clusters as number;
        const clusterCenters: Array<[number, number]> = [];
        for (let i = 0; i < clusters; i++) {
          clusterCenters.push([rng() * width, rng() * height]);
        }
        const count = Math.floor((width * height) / (colSpacing * rowSpacing * 1.5));
        for (let i = 0; i < count; i++) {
          const [cx, cy] = clusterCenters[Math.floor(rng() * clusters)];
          const x = cx + (rng() - 0.5) * width * 0.3;
          const y = cy + (rng() - 0.5) * height * 0.3;
          placements.push({ x, y, angle: 0, scale: 1, text });
        }
      } else if (type === "constellation") {
        const count = Math.floor((width * height) / (colSpacing * rowSpacing * 3));
        for (let i = 0; i < count; i++) {
          const x = rng() * width;
          const y = rng() * height;
          placements.push({ x, y, angle: 0, scale: 1, text });
        }
      } else if (type === "fractal") {
        const octaves = params.octaves as number;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const n = fractalNoise(x * 0.004, y * 0.004, seed, octaves);
            if (n > 0.4) {
              const angle = n * 180;
              placements.push({ x, y, angle, scale: 1, text });
            }
          }
        }
      } else if (type === "poisson") {
        const minDist = (params.minDist as number) * spacingMult;
        const grid: Map<string, boolean> = new Map();
        const active: Array<[number, number]> = [];
        const result: Array<[number, number]> = [];
        const cellSize = minDist / Math.sqrt(2);
        const startX = rng() * width, startY = rng() * height;
        active.push([startX, startY]);
        result.push([startX, startY]);
        const key = (x: number, y: number) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
        grid.set(key(startX, startY), true);
        while (active.length > 0 && result.length < 500) {
          const idx = Math.floor(rng() * active.length);
          const [ax, ay] = active[idx];
          let found = false;
          for (let attempt = 0; attempt < 30; attempt++) {
            const angle = rng() * 2 * Math.PI;
            const r = minDist + rng() * minDist;
            const nx = ax + r * Math.cos(angle);
            const ny = ay + r * Math.sin(angle);
            if (nx < 0 || nx > width || ny < 0 || ny > height) continue;
            const k = key(nx, ny);
            if (!grid.has(k)) {
              grid.set(k, true);
              active.push([nx, ny]);
              result.push([nx, ny]);
              found = true;
              break;
            }
          }
          if (!found) active.splice(idx, 1);
        }
        for (const [x, y] of result) {
          placements.push({ x, y, angle: 0, scale: 1, text });
        }
      } else if (type === "brownian") {
        const steps = params.steps as number;
        let x = width / 2, y = height / 2;
        let prevX = x, prevY = y;
        for (let i = 0; i < steps; i++) {
          x += (rng() - 0.5) * colSpacing * 2;
          y += (rng() - 0.5) * rowSpacing * 2;
          x = Math.max(0, Math.min(width, x));
          y = Math.max(0, Math.min(height, y));
          const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
          if (dist >= textWidth * 1.1 * spacingMult) {
            const angle = (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
            prevX = x; prevY = y;
          }
        }
      } else if (type === "voronoi") {
        const cells = params.cells as number;
        const centers: Array<[number, number]> = [];
        for (let i = 0; i < cells; i++) {
          centers.push([rng() * width, rng() * height]);
        }
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            let minDist2 = Infinity, secondMin = Infinity;
            for (const [cx, cy] of centers) {
              const d = (x - cx) ** 2 + (y - cy) ** 2;
              if (d < minDist2) { secondMin = minDist2; minDist2 = d; }
              else if (d < secondMin) secondMin = d;
            }
            const edge = Math.sqrt(secondMin) - Math.sqrt(minDist2);
            if (edge < colSpacing * 0.5) {
              placements.push({ x, y, angle: 0, scale: 1, text });
            }
          }
        }
      } else if (type === "turing") {
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const n1 = smoothNoise(x * 0.01, y * 0.01, seed);
            const n2 = smoothNoise(x * 0.05, y * 0.05, seed + 100);
            if (Math.abs(n1 - n2) < 0.15) {
              placements.push({ x, y, angle: 0, scale: 1, text });
            }
          }
        }
      }
      break;
    }

    case "custom": {
      const type = params.type as string;
      const cx = width / 2, cy = height / 2;

      if (type === "phyllotaxis") {
        const scale = params.scale as number;
        const count = Math.floor((width * height) / (textWidth * lineHeight * 2 * spacingMult));
        const pts = phyllotaxisPoints(count, scale * Math.min(width, height) / 100, width, height);
        for (const [x, y, angle] of pts) {
          placements.push({ x, y, angle, scale: 1, text });
        }
      } else if (type === "hilbert") {
        const order = params.order as number;
        const n = Math.pow(2, order);
        const cellSize = Math.min(width, height) / n;
        const total = n * n;
        let prevX = -1, prevY = -1;
        for (let d = 0; d < total; d++) {
          const [hx, hy] = hilbertD2xy(n, d);
          const x = (hx + 0.5) * cellSize;
          const y = (hy + 0.5) * cellSize;
          const dist = prevX < 0 ? textWidth * 2 : Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
          if (dist >= textWidth * 1.1 * spacingMult) {
            const angle = prevX < 0 ? 0 : (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
            prevX = x; prevY = y;
          }
        }
      } else if (type === "dragon") {
        const iterations = params.iterations as number;
        const pts = dragonCurve(Math.min(iterations, 12));
        if (pts.length > 0) {
          const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const scaleX = width * 0.8 / (maxX - minX || 1);
          const scaleY = height * 0.8 / (maxY - minY || 1);
          const s = Math.min(scaleX, scaleY);
          const offX = (width - (maxX - minX) * s) / 2;
          const offY = (height - (maxY - minY) * s) / 2;
          let prevX = -1, prevY = -1;
          for (const [px, py] of pts) {
            const x = offX + (px - minX) * s;
            const y = offY + (py - minY) * s;
            const dist = prevX < 0 ? textWidth * 2 : Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
            if (dist >= textWidth * 1.1 * spacingMult) {
              const angle = prevX < 0 ? 0 : (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
              placements.push({ x, y, angle, scale: 1, text });
              prevX = x; prevY = y;
            }
          }
        }
      } else if (type === "dna") {
        const pitch = params.pitch as number;
        const radius = (params.radius as number) * density;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let x = 0; x < width + textWidth; x += colSpacing) {
          const t = (x / width) * 2 * Math.PI * (width / pitch);
          const y1 = cy + radius * Math.sin(t);
          const y2 = cy + radius * Math.sin(t + Math.PI);
          placements.push({ x, y: y1, angle: 0, scale: 1, text });
          placements.push({ x, y: y2, angle: 0, scale: 1, text });
        }
      } else if (type === "fingerprint") {
        const loops = params.loops as number;
        const maxR = Math.min(width, height) * 0.45;
        for (let loop = 1; loop <= loops; loop++) {
          const r = (loop / loops) * maxR;
          const warp = 0.3 * Math.sin(loop * 0.8);
          const circumference = 2 * Math.PI * r;
          const count = Math.max(4, Math.floor(circumference / (textWidth * 1.1 * spacingMult)));
          for (let i = 0; i < count; i++) {
            const theta = (i / count) * 2 * Math.PI;
            const rWarp = r * (1 + warp * Math.sin(3 * theta));
            const x = cx + rWarp * Math.cos(theta);
            const y = cy + rWarp * Math.sin(theta);
            const angle = (theta * 180) / Math.PI + 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "topo") {
        const levels = params.levels as number;
        for (let level = 1; level <= levels; level++) {
          const threshold = level / levels;
          const rowSpacing = lineHeight * 2 * spacingMult;
          const colSpacing = textWidth * 1.1 * spacingMult;
          for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
            for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
              const n = fractalNoise(x * 0.005, y * 0.005, level * 100, 4);
              if (Math.abs(n - threshold) < 0.05) {
                placements.push({ x, y, angle: 0, scale: 1, text });
              }
            }
          }
        }
      } else if (type === "circuit") {
        const rowSpacing = lineHeight * 2 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        const rng = createRng(42);
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          let x = 0;
          while (x < width) {
            const segLen = (1 + rng() * 4) * colSpacing;
            for (let sx = x; sx < x + segLen && sx < width; sx += colSpacing) {
              placements.push({ x: sx, y, angle: 0, scale: 1, text });
            }
            x += segLen + rng() * colSpacing * 2;
          }
        }
      } else if (type === "barcode") {
        const variation = params.variation as number;
        const rng = createRng(42);
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let x = 0; x < width; x += colSpacing * (1 + rng() * variation)) {
          for (let y = lineHeight; y < height + lineHeight; y += lineHeight * spacingMult) {
            placements.push({ x, y, angle: 90, scale: 1, text });
          }
        }
      } else if (type === "weave") {
        const over = params.over as number;
        const under = params.under as number;
        const period = over + under;
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        let rowIndex = 0;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing, rowIndex++) {
          let colIndex = 0;
          for (let x = -textWidth; x < width + textWidth; x += colSpacing, colIndex++) {
            const phase = (colIndex + rowIndex * Math.floor(period / 2)) % period;
            const angle = phase < over ? 0 : 90;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "moire") {
        const angle1 = (params.angle1 as number) * Math.PI / 180;
        const angle2 = (params.angle2 as number) * Math.PI / 180;
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const proj1 = x * Math.cos(angle1) + y * Math.sin(angle1);
            const proj2 = x * Math.cos(angle2) + y * Math.sin(angle2);
            const stripe1 = Math.sin(proj1 * 0.1) > 0;
            const stripe2 = Math.sin(proj2 * 0.1) > 0;
            if (stripe1 !== stripe2) {
              placements.push({ x, y, angle: 0, scale: 1, text });
            }
          }
        }
      } else if (type === "interference") {
        const sources = params.sources as number;
        const srcPts: Array<[number, number]> = [];
        for (let i = 0; i < sources; i++) {
          const a = (i / sources) * 2 * Math.PI;
          srcPts.push([cx + Math.cos(a) * width * 0.3, cy + Math.sin(a) * height * 0.3]);
        }
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            let sum = 0;
            for (const [sx, sy] of srcPts) {
              const r = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);
              sum += Math.sin(r * 0.1);
            }
            if (sum > 0.5) {
              placements.push({ x, y, angle: 0, scale: 1, text });
            }
          }
        }
      } else if (type === "meander") {
        const depth = params.depth as number;
        const unit = Math.min(width, height) / (Math.pow(2, depth) * 4);
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const mx = Math.floor(x / unit) % 4;
            const my = Math.floor(y / unit) % 4;
            const isBorder = mx === 0 || my === 0 || mx === 3 || my === 3;
            if (isBorder) {
              placements.push({ x, y, angle: 0, scale: 1, text });
            }
          }
        }
      } else if (type === "lorenz") {
        // Lorenz attractor
        let lx = 0.1, ly = 0, lz = 0;
        const dt = params.dt as number;
        const steps = params.steps as number;
        const sigma = 10, rho = 28, beta = 8 / 3;
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < steps; i++) {
          const dx = sigma * (ly - lx);
          const dy = lx * (rho - lz) - ly;
          const dz = lx * ly - beta * lz;
          lx += dx * dt; ly += dy * dt; lz += dz * dt;
          pts.push([lx, lz]);
        }
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const scaleX = width * 0.9 / (maxX - minX);
        const scaleY = height * 0.9 / (maxY - minY);
        const s = Math.min(scaleX, scaleY);
        const offX = (width - (maxX - minX) * s) / 2;
        const offY = (height - (maxY - minY) * s) / 2;
        let prevX = -1, prevY = -1;
        for (const [px, py] of pts) {
          const x = offX + (px - minX) * s;
          const y = offY + (py - minY) * s;
          const dist = prevX < 0 ? textWidth * 2 : Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
          if (dist >= textWidth * 1.1 * spacingMult) {
            const angle = prevX < 0 ? 0 : (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
            prevX = x; prevY = y;
          }
        }
      } else if (type === "diffraction") {
        const slits = params.slits as number;
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            let intensity = 0;
            for (let s = 0; s < slits; s++) {
              const slitX = (s / (slits - 1)) * width;
              const r = Math.sqrt((x - slitX) ** 2 + y * y);
              intensity += Math.cos(r * 0.08);
            }
            if (intensity > slits * 0.3) {
              placements.push({ x, y, angle: 0, scale: 1, text });
            }
          }
        }
      } else if (type === "knot") {
        // Torus knot
        const p = 2, q = 3;
        const pts: Array<[number, number]> = [];
        for (let t = 0; t < 2 * Math.PI * p; t += 0.02) {
          const r = Math.cos(q * t) + 2;
          const x = cx + r * Math.cos(p * t) * Math.min(width, height) * 0.2;
          const y = cy + r * Math.sin(p * t) * Math.min(width, height) * 0.2;
          pts.push([x, y]);
        }
        let prevX = -1, prevY = -1;
        for (const [x, y] of pts) {
          const dist = prevX < 0 ? textWidth * 2 : Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
          if (dist >= textWidth * 1.1 * spacingMult) {
            const angle = prevX < 0 ? 0 : (Math.atan2(y - prevY, x - prevX) * 180) / Math.PI;
            placements.push({ x, y, angle, scale: 1, text });
            prevX = x; prevY = y;
          }
        }
      } else if (type === "penrose") {
        // Simplified Penrose-like tiling using two rhombus types
        const rng = createRng(42);
        const tileSize = Math.min(width, height) / 8;
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const tx = Math.floor(x / tileSize);
            const ty = Math.floor(y / tileSize);
            const n = noise2d(tx, ty, 42);
            const angle = n > 0.5 ? 36 : 72;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "truchet") {
        const tileSize = params.tileSize as number;
        const rng = createRng(42);
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const tx = Math.floor(x / tileSize);
            const ty = Math.floor(y / tileSize);
            const n = noise2d(tx, ty, 42);
            const angle = n > 0.5 ? 45 : -45;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "gosper") {
        // Simplified gosper curve using L-system
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const n = fractalNoise(x * 0.008, y * 0.008, 42, 3);
            const angle = n * 360;
            placements.push({ x, y, angle, scale: 1, text });
          }
        }
      } else if (type === "maze") {
        const cellSize = params.cellSize as number;
        const rng = createRng(42);
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.1 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            const cx2 = Math.floor(x / cellSize);
            const cy2 = Math.floor(y / cellSize);
            const n = noise2d(cx2, cy2, 42);
            const isWall = n > 0.6;
            if (isWall) {
              const angle = n > 0.8 ? 0 : 90;
              placements.push({ x, y, angle, scale: 1, text });
            }
          }
        }
      } else {
        // Fallback: simple grid
        const rowSpacing = lineHeight * 1.5 * spacingMult;
        const colSpacing = textWidth * 1.2 * spacingMult;
        for (let y = lineHeight; y < height + lineHeight; y += rowSpacing) {
          for (let x = -textWidth; x < width + textWidth; x += colSpacing) {
            placements.push({ x, y, angle: 0, scale: 1, text });
          }
        }
      }
      break;
    }
  }

  return placements;
}

export function renderToCanvas(canvas: HTMLCanvasElement, opts: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = opts.backgroundColor;
  ctx.fillRect(0, 0, opts.width, opts.height);

  const placements = generatePlacements(opts);

  ctx.fillStyle = opts.textColor;
  ctx.font = `${opts.fontSize}px monospace`;
  ctx.textBaseline = "middle";

  for (const p of placements) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.scale(p.scale, p.scale);
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}

export function renderToSVG(opts: RenderOptions): string {
  const placements = generatePlacements(opts);
  const escapedBg = opts.backgroundColor.replace(/"/g, "&quot;");
  const escapedColor = opts.textColor.replace(/"/g, "&quot;");

  const textElements = placements
    .map((p) => {
      const transform = `translate(${p.x.toFixed(2)},${p.y.toFixed(2)}) rotate(${p.angle.toFixed(2)}) scale(${p.scale.toFixed(3)})`;
      const escapedText = p.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return `  <text transform="${transform}" font-size="${opts.fontSize}" font-family="monospace" fill="${escapedColor}" dominant-baseline="middle">${escapedText}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">
  <rect width="${opts.width}" height="${opts.height}" fill="${escapedBg}"/>
${textElements}
</svg>`;
}
