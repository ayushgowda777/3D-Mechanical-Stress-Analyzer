/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnalyzerParams } from '../types/analyzer';
import { Download, RefreshCw, Sparkles, Sliders } from 'lucide-react';

interface HeaderProps {
  onApplyPreset: (preset: Partial<AnalyzerParams>) => void;
  onReset: () => void;
  onExportReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onApplyPreset,
  onReset,
  onExportReport
}) => {
  const [activePreset, setActivePreset] = useState<string>('steel_cantilever');

  const presets = [
    {
      id: 'steel_cantilever',
      name: 'Steel Cantilever',
      data: {
        length: 500,
        width: 40,
        thickness: 20,
        crossSection: 'rectangular' as const,
        orientation: 'horizontal' as const,
        supportType: 'cantilever' as const,
        materialId: 'structural_steel',
        force: 2500,
        forcePosition: 500,
        deformationScale: 25
      }
    },
    {
      id: 'aluminum_drone_arm',
      name: 'Aluminum Arm',
      data: {
        length: 300,
        diameter: 25,
        crossSection: 'circular' as const,
        orientation: 'horizontal' as const,
        supportType: 'cantilever' as const,
        materialId: 'aluminum_6061_t6',
        force: 600,
        forcePosition: 300,
        deformationScale: 15
      }
    },
    {
      id: 'titanium_rod',
      name: 'Titanium Rod',
      data: {
        length: 400,
        diameter: 18,
        crossSection: 'circular' as const,
        orientation: 'vertical' as const,
        supportType: 'cantilever' as const,
        materialId: 'titanium_grade_5',
        force: 950,
        forcePosition: 400,
        deformationScale: 20
      }
    },
    {
      id: 'carbon_fiber_mast',
      name: 'Carbon Mast',
      data: {
        length: 750,
        diameter: 32,
        crossSection: 'circular' as const,
        orientation: 'vertical' as const,
        supportType: 'cantilever' as const,
        materialId: 'carbon_fiber',
        force: 1200,
        forcePosition: 750,
        deformationScale: 30
      }
    },
    {
      id: 'timber_joist',
      name: 'Timber Joist',
      data: {
        length: 1000,
        width: 50,
        thickness: 100,
        crossSection: 'rectangular' as const,
        orientation: 'horizontal' as const,
        supportType: 'simply_supported' as const,
        materialId: 'structural_timber',
        force: 3200,
        forcePosition: 500,
        deformationScale: 40
      }
    }
  ];

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0">
      {/* Zone 1: Brand title, single line */}
      <div className="flex items-center gap-3">
        <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
          3D Mechanical Stress Analyzer
        </span>
      </div>

      {/* Zone 2: Preset selector tabs */}
      <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-950/70 rounded-lg border border-slate-800/80">
        <span className="text-[11px] font-medium text-slate-500 px-2">Presets:</span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              setActivePreset(preset.id);
              onApplyPreset(preset.data);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activePreset === preset.id
                ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          title="Reset to default baseline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={onExportReport}
          title="Export Analysis Report"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap font-semibold shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Report</span>
        </button>
      </div>
    </header>
  );
};
