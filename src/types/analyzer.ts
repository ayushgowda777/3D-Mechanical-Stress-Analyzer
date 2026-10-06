/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CrossSectionType = 'rectangular' | 'circular';
export type OrientationType = 'horizontal' | 'vertical';
export type SupportType = 'cantilever' | 'simply_supported';

export interface Material {
  id: string;
  name: string;
  category: string;
  elasticModulus: number; // in GPa (e.g. 200 for Steel)
  yieldStrength: number;  // in MPa (e.g. 250)
  ultimateStrength: number; // in MPa (e.g. 400)
  density: number;        // in kg/m^3 (e.g. 7850)
  poissonRatio: number;   // e.g. 0.30
  description: string;
}

export interface AnalyzerParams {
  length: number;           // mm
  width: number;            // mm (for rectangular)
  thickness: number;        // mm (for rectangular)
  diameter: number;         // mm (for circular)
  crossSection: CrossSectionType;
  orientation: OrientationType;
  supportType: SupportType;
  materialId: string;
  customMaterial?: {
    name: string;
    elasticModulus: number; // GPa
    yieldStrength: number;  // MPa
    density: number;        // kg/m^3
  };
  force: number;            // N (positive)
  forcePosition: number;    // mm (from root x=0 to L)
  forceDirection: 'negative_y' | 'positive_y'; // downwards or upwards
  deformationScale: number; // e.g. 1 to 100x exaggeration
}

export interface AnalysisResults {
  maxStress: number;           // MPa
  maxStressLocation: { x: number; y: number; z: number }; // mm in model coordinates
  maxDeflection: number;       // mm
  maxDeflectionLocation: number; // mm along length
  safetyFactor: number;        // sigma_yield / sigma_max
  reactionForce: number;       // N
  reactionMoment: number;      // N*m
  momentOfInertia: number;     // mm^4
  sectionModulus: number;      // mm^3
  crossSectionArea: number;    // mm^2
  volume: number;              // mm^3
  mass: number;                // kg
  status: 'safe' | 'warning' | 'failure'; // Safe (SF >= 2.0), Warning (1.0 <= SF < 2.0), Failure (SF < 1.0)
}
