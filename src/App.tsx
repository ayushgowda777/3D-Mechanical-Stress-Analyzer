/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AnalyzerParams } from './types/analyzer';
import { getMaterialById } from './utils/materials';
import { analyzeBeam } from './utils/physics';
import { Header } from './components/Header';
import { ParameterForm } from './components/ParameterForm';
import { ThreeStressViewer } from './components/ThreeStressViewer';
import { DiagramsPanel } from './components/DiagramsPanel';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

const DEFAULT_PARAMS: AnalyzerParams = {
  length: 500,
  width: 40,
  thickness: 20,
  diameter: 30,
  crossSection: 'rectangular',
  orientation: 'horizontal',
  supportType: 'cantilever',
  materialId: 'structural_steel',
  force: 2500,
  forcePosition: 500,
  forceDirection: 'negative_y',
  deformationScale: 25
};

export default function App() {
  const [params, setParams] = useState<AnalyzerParams>(DEFAULT_PARAMS);
  const [showDiagrams, setShowDiagrams] = useState<boolean>(true);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  // Current active material
  const currentMaterial = useMemo(() => {
    return getMaterialById(params.materialId);
  }, [params.materialId]);

  // Real-time analysis recalculation
  const results = useMemo(() => {
    return analyzeBeam(params, currentMaterial);
  }, [params, currentMaterial]);

  // Update handlers
  const handleUpdateParams = (updates: Partial<AnalyzerParams>) => {
    setParams((prev) => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
  };

  // Generate and download formal Engineering Calculation Report
  const handleExportReport = () => {
    const reportText = `=====================================================
    MECHANICAL STRESS & DEFLECTION ANALYSIS REPORT
=====================================================
Generated: ${new Date().toLocaleString()}

1. MODEL GEOMETRY
-----------------------------------------------------
Cross-Section Type : ${params.crossSection.toUpperCase()}
Orientation        : ${params.orientation.toUpperCase()}
Support Condition  : ${params.supportType.toUpperCase()}
Length (L)         : ${params.length} mm
${
  params.crossSection === 'rectangular'
    ? `Width (w)          : ${params.width} mm\nThickness (t)      : ${params.thickness} mm`
    : `Diameter (Ø)       : ${params.diameter} mm`
}
Cross-Section Area : ${results.crossSectionArea.toFixed(2)} mm²
Moment of Inertia  : ${results.momentOfInertia.toExponential(4)} mm⁴
Section Modulus    : ${results.sectionModulus.toFixed(2)} mm³

2. MATERIAL PROPERTIES
-----------------------------------------------------
Material Name      : ${currentMaterial.name}
Elastic Modulus (E): ${currentMaterial.elasticModulus} GPa (${currentMaterial.elasticModulus * 1000} MPa)
Yield Strength (σy): ${currentMaterial.yieldStrength} MPa
Ultimate Strength  : ${currentMaterial.ultimateStrength} MPa
Density (ρ)        : ${currentMaterial.density} kg/m³
Estimated Mass     : ${results.mass < 1 ? (results.mass * 1000).toFixed(1) + ' g' : results.mass.toFixed(3) + ' kg'}

3. LOADING CONDITIONS
-----------------------------------------------------
Applied Force (F)  : ${params.force} N (${params.forceDirection === 'negative_y' ? 'Downward -Y' : 'Upward +Y'})
Application Point  : x = ${params.forcePosition} mm from support (${((params.forcePosition / params.length) * 100).toFixed(1)}% span)

4. ANALYSIS RESULTS
-----------------------------------------------------
Maximum Stress     : ${results.maxStress.toFixed(2)} MPa
Critical Location  : x = ${results.maxStressLocation.x} mm, extreme fiber
Yield Ratio        : ${((results.maxStress / currentMaterial.yieldStrength) * 100).toFixed(1)}% of Yield Strength
Safety Factor (SF) : ${results.safetyFactor > 99 ? '> 99' : results.safetyFactor.toFixed(2)}
Status             : ${results.status.toUpperCase()}
Maximum Deflection : ${results.maxDeflection.toFixed(3)} mm (Span ratio: L/${Math.round(params.length / Math.max(results.maxDeflection, 1e-4))})
Reaction Force     : ${results.reactionForce} N
Reaction Moment    : ${results.reactionMoment.toFixed(2)} N·m

=====================================================
End of Report
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stress-Report-${params.crossSection}-${params.materialId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        onApplyPreset={(preset) => setParams((prev) => ({ ...prev, ...preset }))}
        onReset={handleReset}
        onExportReport={handleExportReport}
      />

      {/* Main Unified Workspace Frame */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Parameter Settings Panel */}
        <div className="w-full md:w-[380px] lg:w-[410px] bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 z-10 shadow-xl overflow-hidden">
          {/* Panel Title Bar */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div>
              <h2 className="text-xs font-semibold text-white tracking-wide uppercase">
                Model Parameters
              </h2>
              <p className="text-[11px] text-slate-400">
                Instant real-time 3D FEA feedback
              </p>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
              v1.0 Solver
            </span>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 overflow-y-auto">
            <ParameterForm
              params={params}
              onChange={handleUpdateParams}
              selectedMaterial={currentMaterial}
            />
          </div>

          {/* Structural Status Banner at bottom of parameters */}
          <div
            className={`p-3 border-t text-xs flex items-center gap-2.5 ${
              results.status === 'safe'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : results.status === 'warning'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {results.status === 'safe' ? (
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : results.status === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <div className="flex-1 leading-tight">
              <span className="font-semibold block">
                {results.status === 'safe'
                  ? 'Structural Design Safe (SF ≥ 2.0)'
                  : results.status === 'warning'
                  ? 'Marginal Safety Margin (1.0 ≤ SF < 2.0)'
                  : 'Plastic Yielding / Failure Risk (SF < 1.0)'}
              </span>
              <span className="text-[11px] opacity-80">
                σ_max is {((results.maxStress / currentMaterial.yieldStrength) * 100).toFixed(0)}% of yield strength ({currentMaterial.yieldStrength} MPa)
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right 3D Viewport & Bottom Analysis Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-slate-950">
          {/* 3D WebGL Canvas Viewport */}
          <div className="flex-1 min-h-[300px] relative">
            <ThreeStressViewer
              params={params}
              results={results}
              material={currentMaterial}
              onUpdateParams={handleUpdateParams}
            />
          </div>

          {/* Collapsible Lower Engineering Analysis Drawer */}
          <div className="shrink-0 flex flex-col">
            {/* Toggle Drawer Button */}
            <button
              onClick={() => setShowDiagrams(!showDiagrams)}
              className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 hover:bg-slate-850 border-t border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Structural Diagrams & Mechanical Formulations</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-[11px]">{showDiagrams ? 'Hide' : 'Expand'}</span>
                {showDiagrams ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {/* Diagrams Panel Content */}
            {showDiagrams && (
              <DiagramsPanel
                params={params}
                results={results}
                material={currentMaterial}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
