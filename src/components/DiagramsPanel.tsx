/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnalyzerParams, AnalysisResults, Material } from '../types/analyzer';
import {
  getBendingMomentAt,
  getShearForceAt,
  getDeflectionAt,
  calculateCrossSection
} from '../utils/physics';
import { TrendingUp, BarChart2, BookOpen, Layers } from 'lucide-react';

interface DiagramsPanelProps {
  params: AnalyzerParams;
  results: AnalysisResults;
  material: Material;
}

export const DiagramsPanel: React.FC<DiagramsPanelProps> = ({
  params,
  results,
  material
}) => {
  const [activeTab, setActiveTab] = useState<'bmd_sfd' | 'cross_section' | 'formulas'>('bmd_sfd');

  const L = params.length;
  const numSamplePoints = 120;
  const points: { x: number; V: number; M: number; def: number }[] = [];

  let maxMoment = 0;
  let maxShear = Math.abs(params.force);

  for (let i = 0; i <= numSamplePoints; i++) {
    const x = (i / numSamplePoints) * L;
    const M = getBendingMomentAt(x, params); // N*mm
    const V = getShearForceAt(x, params); // N
    const def = getDeflectionAt(x, params, material); // mm
    if (Math.abs(M) > maxMoment) maxMoment = Math.abs(M);
    if (Math.abs(V) > maxShear) maxShear = Math.abs(V);
    points.push({ x, V, M, def });
  }

  // Max moment in N*m for clean display
  const maxMomentNm = maxMoment / 1000;
  const { width: w, thickness: t, c, sectionModulus, inertia } = calculateCrossSection(params);

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-slate-200">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/60 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('bmd_sfd')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'bmd_sfd'
                ? 'bg-slate-800 text-sky-400 border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Shear & Moment Diagrams (SFD / BMD)</span>
          </button>
          <button
            onClick={() => setActiveTab('cross_section')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'cross_section'
                ? 'bg-slate-800 text-sky-400 border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cross-Section Stress Distribution</span>
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'formulas'
                ? 'bg-slate-800 text-sky-400 border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Theory & Analytical Formulas</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          Beam L = {L} mm · Load F = {params.force} N @ x = {params.forcePosition} mm
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-4">
        {activeTab === 'bmd_sfd' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shear Force Diagram (SFD) */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-sky-400">
                  Shear Force Diagram V(x)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  V_max = {maxShear.toFixed(0)} N
                </span>
              </div>
              <div className="h-32 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                  {/* Baseline V=0 */}
                  <line x1="20" y1="60" x2="480" y2="60" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
                  
                  {/* SFD path */}
                  {(() => {
                    const baselineY = 60;
                    const scaleY = maxShear > 0 ? 45 / maxShear : 1;
                    const pointsSvg = points.map((p) => {
                      const sx = 20 + (p.x / L) * 460;
                      const sy = baselineY - p.V * scaleY;
                      return `${sx},${sy}`;
                    });
                    const firstX = 20;
                    const lastX = 480;
                    const polygonPts = `${firstX},${baselineY} ${pointsSvg.join(' ')} ${lastX},${baselineY}`;

                    return (
                      <>
                        <polygon points={polygonPts} fill="#0284c7" fillOpacity="0.25" />
                        <polyline points={pointsSvg.join(' ')} fill="none" stroke="#38bdf8" strokeWidth="2" />
                      </>
                    );
                  })()}

                  {/* Axis annotations */}
                  <text x="25" y="20" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                    +{maxShear.toFixed(0)} N
                  </text>
                  <text x="25" y="65" fill="#64748b" fontSize="9" fontFamily="monospace">
                    0 N
                  </text>
                  <text x="460" y="75" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    x = {L} mm
                  </text>
                </svg>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>x = 0 (Support)</span>
                <span>x = {params.forcePosition} mm (Applied Load)</span>
                <span>x = {L} mm (Tip)</span>
              </div>
            </div>

            {/* Bending Moment Diagram (BMD) */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-rose-400">
                  Bending Moment Diagram M(x)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  M_max = {maxMomentNm.toFixed(1)} N·m
                </span>
              </div>
              <div className="h-32 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                  {/* Baseline M=0 */}
                  <line x1="20" y1="100" x2="480" y2="100" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />

                  {/* BMD Path */}
                  {(() => {
                    const baselineY = 100;
                    const scaleY = maxMoment > 0 ? 80 / maxMoment : 1;
                    const pointsSvg = points.map((p) => {
                      const sx = 20 + (p.x / L) * 460;
                      const sy = baselineY - p.M * scaleY;
                      return `${sx},${sy}`;
                    });
                    const firstX = 20;
                    const lastX = 480;
                    const polygonPts = `${firstX},${baselineY} ${pointsSvg.join(' ')} ${lastX},${baselineY}`;

                    return (
                      <>
                        <polygon points={polygonPts} fill="#e11d48" fillOpacity="0.25" />
                        <polyline points={pointsSvg.join(' ')} fill="none" stroke="#fb7185" strokeWidth="2" />
                      </>
                    );
                  })()}

                  {/* Axis annotations */}
                  <text x="25" y="25" fill="#fda4af" fontSize="10" fontFamily="monospace">
                    M_max = {maxMomentNm.toFixed(1)} N·m
                  </text>
                  <text x="460" y="112" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    x = {L} mm
                  </text>
                </svg>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>x = 0 (Fixed Root)</span>
                <span>x = {params.forcePosition} mm</span>
                <span>x = {L} mm</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cross_section' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
            {/* Visual Cross-Section Profile with Stress Gradient */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 mb-2">
                Stress Profile at Critical Section (x = {results.maxStressLocation.x} mm)
              </span>

              <div className="relative w-48 h-48 flex items-center justify-center">
                {params.crossSection === 'circular' ? (
                  // Circular Cross Section
                  <div className="relative w-40 h-40 rounded-full border-2 border-slate-600 overflow-hidden flex flex-col">
                    {/* Upper tension fiber (Red -> Yellow) */}
                    <div className="flex-1 bg-gradient-to-t from-[#ffd700] to-[#ef4444] opacity-90" />
                    {/* Neutral Axis (Blue) */}
                    <div className="h-1 bg-[#0055ff] w-full" />
                    {/* Lower compression fiber (Yellow -> Red) */}
                    <div className="flex-1 bg-gradient-to-b from-[#ffd700] to-[#ef4444] opacity-90" />
                  </div>
                ) : (
                  // Rectangular Cross Section
                  <div className="relative w-44 h-36 border-2 border-slate-600 overflow-hidden flex flex-col rounded-sm">
                    {/* Upper tensile half */}
                    <div className="flex-1 bg-gradient-to-t from-[#ffd700] to-[#ef4444] opacity-90 flex items-start justify-center pt-1 text-[10px] font-mono text-white font-bold">
                      +{results.maxStress.toFixed(1)} MPa (Tension)
                    </div>
                    {/* Neutral Axis line */}
                    <div className="h-0.5 bg-[#0055ff] w-full flex items-center justify-center">
                      <span className="bg-slate-950 px-1 text-[9px] font-mono text-sky-400">
                        σ = 0 (Neutral Axis)
                      </span>
                    </div>
                    {/* Lower compressive half */}
                    <div className="flex-1 bg-gradient-to-b from-[#ffd700] to-[#ef4444] opacity-90 flex items-end justify-center pb-1 text-[10px] font-mono text-white font-bold">
                      -{results.maxStress.toFixed(1)} MPa (Compression)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Geometric and Section Properties Details */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-sky-400">Section Characteristics</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Cross-Section Area (A):</span>
                  <span className="font-mono text-sm text-sky-300 font-semibold tabular-nums">
                    {results.crossSectionArea.toFixed(1)} mm²
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Second Moment of Area (I):</span>
                  <span className="font-mono text-sm text-sky-300 font-semibold tabular-nums">
                    {results.momentOfInertia.toExponential(2)} mm⁴
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Section Modulus (S):</span>
                  <span className="font-mono text-sm text-sky-300 font-semibold tabular-nums">
                    {results.sectionModulus.toFixed(0)} mm³
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Distance to Outer Fiber (c):</span>
                  <span className="font-mono text-sm text-sky-300 font-semibold tabular-nums">
                    {c.toFixed(1)} mm
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Under flexural bending, normal stress varies linearly with vertical distance from the neutral axis: <code className="text-sky-300 font-mono">σ(y) = (M · y) / I</code>. The extreme fibers at the outer surface bear the peak stress.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div className="space-y-1.5 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-sky-400 block">1. Flexure Formula</span>
              <code className="block font-mono bg-slate-950 p-2 rounded text-emerald-300 text-xs">
                σ_max = (M_max · c) / I = M_max / S
              </code>
              <p className="text-[11px] text-slate-400">
                Peak normal bending stress occurring at the root clamping boundary on top/bottom surfaces.
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-sky-400 block">2. Elastic Tip Deflection</span>
              <code className="block font-mono bg-slate-950 p-2 rounded text-emerald-300 text-xs">
                δ_max = [F · a² · (3L - a)] / (6 · E · I)
              </code>
              <p className="text-[11px] text-slate-400">
                Euler-Bernoulli beam deflection solution for point load F located at distance a from the fixed wall.
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-sky-400 block">3. Safety Factor Criteria</span>
              <code className="block font-mono bg-slate-950 p-2 rounded text-emerald-300 text-xs">
                SF = σ_yield / σ_max
              </code>
              <p className="text-[11px] text-slate-400">
                Ratio of material yield threshold to maximum computed stress. Values below 1.0 indicate permanent plastic deformation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
