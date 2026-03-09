"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROPRINT_PATTERNS, PATTERN_CATEGORIES } from "@/lib/microprint-patterns";
import type { MicroprintPattern } from "@/lib/microprint-patterns";
import { renderToCanvas, renderToSVG } from "@/lib/microprint-renderer";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function MicroprintGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [text, setText] = useState("MICROPRINT");
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(6);
  const [density, setDensity] = useState(1.0);
  const [selectedPattern, setSelectedPattern] = useState<MicroprintPattern>(MICROPRINT_PATTERNS[0]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [patternSearch, setPatternSearch] = useState("");
  const [showPatternPanel, setShowPatternPanel] = useState(false);

  const filteredPatterns = MICROPRINT_PATTERNS.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch =
      patternSearch === "" ||
      p.name.toLowerCase().includes(patternSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(patternSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderToCanvas(canvas, {
      text: text || "MICROPRINT",
      textColor,
      backgroundColor,
      fontSize,
      density,
      pattern: selectedPattern,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
  }, [text, textColor, backgroundColor, fontSize, density, selectedPattern]);

  useEffect(() => {
    const timer = setTimeout(renderCanvas, 10);
    return () => clearTimeout(timer);
  }, [renderCanvas]);

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `microprint-${selectedPattern.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [selectedPattern]);

  const exportSVG = useCallback(() => {
    const svgContent = renderToSVG({
      text: text || "MICROPRINT",
      textColor,
      backgroundColor,
      fontSize,
      density,
      pattern: selectedPattern,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `microprint-${selectedPattern.name.toLowerCase().replace(/\s+/g, "-")}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [text, textColor, backgroundColor, fontSize, density, selectedPattern]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              <span className="text-blue-400">Micro</span>Print Studio
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Create intricate microprinting patterns with 100 unique styles
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportPNG}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PNG
            </button>
            <button
              onClick={exportSVG}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export SVG
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full gap-0">
        {/* Left Controls Panel */}
        <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Text Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Microprint Text
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to repeat..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Colors */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Colors
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-700 bg-transparent p-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Text Color</div>
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-700 bg-transparent p-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Background Color</div>
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Color Presets */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Color Presets
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { text: "#000000", bg: "#ffffff", label: "Classic" },
                  { text: "#ffffff", bg: "#000000", label: "Inverse" },
                  { text: "#1a1a2e", bg: "#e8f4f8", label: "Navy" },
                  { text: "#2d5016", bg: "#f0f7e6", label: "Forest" },
                  { text: "#7c2d12", bg: "#fef3c7", label: "Amber" },
                  { text: "#1e3a5f", bg: "#dbeafe", label: "Ocean" },
                  { text: "#4a044e", bg: "#fdf4ff", label: "Purple" },
                  { text: "#7f1d1d", bg: "#fff1f2", label: "Rose" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setTextColor(preset.text);
                      setBackgroundColor(preset.bg);
                    }}
                    title={preset.label}
                    className="h-8 rounded border border-gray-700 hover:border-blue-500 transition-colors text-xs font-medium overflow-hidden"
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Font Size: <span className="text-white">{fontSize}px</span>
              </label>
              <input
                type="range"
                min={3}
                max={24}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3px (micro)</span>
                <span>24px (large)</span>
              </div>
            </div>

            {/* Density */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Pattern Density: <span className="text-white">{density.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Sparse</span>
                <span>Dense</span>
              </div>
            </div>

            {/* Selected Pattern Info */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Active Pattern</div>
              <div className="text-sm font-semibold text-white">{selectedPattern.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{selectedPattern.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  {selectedPattern.category}
                </span>
                <span className="text-xs text-gray-500">#{selectedPattern.id}</span>
              </div>
            </div>

            {/* Pattern Selector Button */}
            <button
              onClick={() => setShowPatternPanel(!showPatternPanel)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              <span>Browse Patterns (100)</span>
              <svg
                className={`w-4 h-4 transition-transform ${showPatternPanel ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </aside>

        {/* Pattern Panel (slides in) */}
        {showPatternPanel && (
          <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Select Pattern</h3>
                <button
                  onClick={() => setShowPatternPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={patternSearch}
                onChange={(e) => setPatternSearch(e.target.value)}
                placeholder="Search patterns..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {PATTERN_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredPatterns.map((pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => {
                    setSelectedPattern(pattern);
                    setShowPatternPanel(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedPattern.id === pattern.id
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-800 text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{pattern.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      selectedPattern.id === pattern.id ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-400"
                    }`}>
                      #{pattern.id}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 ${selectedPattern.id === pattern.id ? "text-blue-200" : "text-gray-500"}`}>
                    {pattern.description}
                  </div>
                </button>
              ))}
              {filteredPatterns.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  No patterns found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-950 overflow-auto">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-lg shadow-2xl border border-gray-800 max-w-full"
          />

          {/* Canvas Info */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>{CANVAS_WIDTH} × {CANVAS_HEIGHT}px</span>
            <span>•</span>
            <span>Pattern: {selectedPattern.name}</span>
            <span>•</span>
            <span>Font: {fontSize}px monospace</span>
            <span>•</span>
            <span>Density: {density.toFixed(1)}x</span>
          </div>

          {/* Quick Pattern Grid */}
          <div className="mt-6 w-full max-w-4xl">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Quick Select — All 100 Patterns
            </h3>
            <div className="grid grid-cols-10 gap-1">
              {MICROPRINT_PATTERNS.map((pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => setSelectedPattern(pattern)}
                  title={`#${pattern.id}: ${pattern.name}\n${pattern.description}`}
                  className={`h-8 rounded text-xs font-medium transition-all ${
                    selectedPattern.id === pattern.id
                      ? "bg-blue-600 text-white ring-2 ring-blue-400"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {pattern.id}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {PATTERN_CATEGORIES.filter(c => c !== "All").map((cat) => {
                const count = MICROPRINT_PATTERNS.filter(p => p.category === cat).length;
                return (
                  <span key={cat} className="text-xs text-gray-500">
                    <span className="text-gray-400">{cat}</span>: {count}
                  </span>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
