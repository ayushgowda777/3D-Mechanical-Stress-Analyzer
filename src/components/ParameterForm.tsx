/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnalyzerParams, CrossSectionType, OrientationType, SupportType, Material } from '../types/analyzer';
import { MATERIALS } from '../utils/materials';
import {
  Sliders,
  Box,
  Circle,
  Compass,
  Zap,
  RotateCw,
  Layers,
  ArrowDown,
  ArrowUp,
  Info
} from 'lucide-react';

interface ParameterFormProps {
  params: AnalyzerParams;
  onChange: (updates: Partial<AnalyzerParams>) => void;
  selectedMaterial: Material;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({
  params,
  onChange,
  selectedMaterial
}) => {
  const handleNumericChange = (key: keyof AnalyzerParams, val: number, min = 1, max = 50000) => {
    const clamped = Math.max(min, Math.min(max, isNaN(val) ? min : val));
    onChange({ [key]: clamped });
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-slate-200 text-sm overflow-y-auto max-h-full">
      {/* 1. Cross-Section & Orientation Quick Selectors */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cross-Section Type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Cross-Section
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ crossSection: 'rectangular' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                params.crossSection === 'rectangular'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5 shrink-0" />
              <span>Rectangular</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ crossSection: 'circular' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                params.crossSection === 'circular'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Circle className="w-3.5 h-3.5 shrink-0" />
              <span>Circular</span>
            </button>
          </div>
        </div>

        {/* Orientation */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Model Orientation
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ orientation: 'horizontal' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                params.orientation === 'horizontal'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Horizontal</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ orientation: 'vertical' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                params.orientation === 'vertical'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>Vertical</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Geometric Dimensions */}
      <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Geometry Dimensions
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Unit: mm</span>
        </div>

        {/* Length L */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">Length (L):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="50"
                max="3000"
                step="10"
                value={params.length}
                onChange={(e) => {
                  const newL = Number(e.target.value);
                  handleNumericChange('length', newL, 50, 3000);
                  if (params.forcePosition > newL) {
                    onChange({ forcePosition: newL });
                  }
                }}
                className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
              />
              <span className="text-slate-500 font-mono text-xs">mm</span>
            </div>
          </div>
          <input
            type="range"
            min="100"
            max="2000"
            step="10"
            value={params.length}
            onChange={(e) => {
              const newL = Number(e.target.value);
              onChange({
                length: newL,
                forcePosition: Math.min(params.forcePosition, newL)
              });
            }}
            className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {params.crossSection === 'rectangular' ? (
          <>
            {/* Width b */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Width (w):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="400"
                    step="1"
                    value={params.width}
                    onChange={(e) => handleNumericChange('width', Number(e.target.value), 5, 400)}
                    className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-slate-500 font-mono text-xs">mm</span>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                step="1"
                value={params.width}
                onChange={(e) => onChange({ width: Number(e.target.value) })}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Thickness / Height t */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Thickness / Depth (t):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="2"
                    max="300"
                    step="1"
                    value={params.thickness}
                    onChange={(e) => handleNumericChange('thickness', Number(e.target.value), 2, 300)}
                    className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-slate-500 font-mono text-xs">mm</span>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="1"
                value={params.thickness}
                onChange={(e) => onChange({ thickness: Number(e.target.value) })}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          </>
        ) : (
          /* Circular Diameter d */
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400">Outer Diameter (Ø):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="300"
                  step="1"
                  value={params.diameter}
                  onChange={(e) => handleNumericChange('diameter', Number(e.target.value), 5, 300)}
                  className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
                />
                <span className="text-slate-500 font-mono text-xs">mm</span>
              </div>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="1"
              value={params.diameter}
              onChange={(e) => onChange({ diameter: Number(e.target.value) })}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        )}
      </div>

      {/* 3. Material Selection */}
      <div className="space-y-2.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Material Specification
          </span>
          <span className="text-[11px] text-slate-500">ISO / ASTM Standards</span>
        </div>

        <select
          value={params.materialId}
          onChange={(e) => onChange({ materialId: e.target.value })}
          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          {MATERIALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — E={m.elasticModulus} GPa, σy={m.yieldStrength} MPa
            </option>
          ))}
        </select>

        {/* Selected Material Quick Technical Specs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block">Modulus E:</span>
            <span className="text-slate-200 font-medium">{selectedMaterial.elasticModulus} GPa</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Yield σy:</span>
            <span className="text-rose-400 font-medium">{selectedMaterial.yieldStrength} MPa</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Density ρ:</span>
            <span className="text-slate-300">{selectedMaterial.density} kg/m³</span>
          </div>
        </div>
      </div>

      {/* 4. Applied Force & Load Position */}
      <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Applied Load
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Static Point Load</span>
        </div>

        {/* Force Magnitude F */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">Force Magnitude (F):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="100000"
                step="50"
                value={params.force}
                onChange={(e) => handleNumericChange('force', Number(e.target.value), 10, 100000)}
                className="w-24 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-amber-400 focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-500 font-mono text-xs">N</span>
            </div>
          </div>
          <input
            type="range"
            min="50"
            max="10000"
            step="50"
            value={params.force}
            onChange={(e) => onChange({ force: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Load Position x_F */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">Position along Length (xF):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max={params.length}
                step="5"
                value={params.forcePosition}
                onChange={(e) => handleNumericChange('forcePosition', Number(e.target.value), 0, params.length)}
                className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-amber-400 focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-500 font-mono text-xs">mm</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={params.length}
            step="5"
            value={params.forcePosition}
            onChange={(e) => onChange({ forcePosition: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />

          {/* Quick Position Percentage Buttons */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-slate-500 mr-1">Snap to:</span>
            {[
              { label: '25%', frac: 0.25 },
              { label: '50% (Mid)', frac: 0.5 },
              { label: '75%', frac: 0.75 },
              { label: '100% (Tip)', frac: 1.0 }
            ].map((p) => {
              const targetPos = Math.round(params.length * p.frac);
              const isActive = Math.abs(params.forcePosition - targetPos) < 2;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ forcePosition: targetPos })}
                  className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Force Direction */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">Force Direction:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ forceDirection: 'negative_y' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                params.forceDirection === 'negative_y'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>Downward (-Y)</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ forceDirection: 'positive_y' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                params.forceDirection === 'positive_y'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUp className="w-3 h-3" />
              <span>Upward (+Y)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Support Boundary Condition */}
      <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <label className="block text-xs font-medium text-slate-400">
          Support Boundary Condition
        </label>
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChange({ supportType: 'cantilever' })}
            className={`py-1.5 px-2 rounded text-xs font-medium transition-colors text-center ${
              params.supportType === 'cantilever'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cantilever (Fixed-Free)
          </button>
          <button
            type="button"
            onClick={() => onChange({ supportType: 'simply_supported' })}
            className={`py-1.5 px-2 rounded text-xs font-medium transition-colors text-center ${
              params.supportType === 'simply_supported'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Simply Supported
          </button>
        </div>
      </div>
    </div>
  );
};
