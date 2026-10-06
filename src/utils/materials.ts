/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Material } from '../types/analyzer';

export const MATERIALS: Material[] = [
  {
    id: 'structural_steel',
    name: 'Structural Steel (ASTM A36)',
    category: 'Steel',
    elasticModulus: 200, // GPa
    yieldStrength: 250,  // MPa
    ultimateStrength: 400, // MPa
    density: 7850,       // kg/m^3
    poissonRatio: 0.29,
    description: 'Standard structural grade for building frames, beams, and mechanical components.'
  },
  {
    id: 'stainless_steel_304',
    name: 'Stainless Steel (AISI 304)',
    category: 'Steel',
    elasticModulus: 193,
    yieldStrength: 215,
    ultimateStrength: 505,
    density: 8000,
    poissonRatio: 0.29,
    description: 'Corrosion resistant austenitic alloy widely used in medical and food equipment.'
  },
  {
    id: 'aluminum_6061_t6',
    name: 'Aluminum (6061-T6)',
    category: 'Aluminum',
    elasticModulus: 68.9,
    yieldStrength: 276,
    ultimateStrength: 310,
    density: 2700,
    poissonRatio: 0.33,
    description: 'Lightweight, heat-treatable aircraft alloy with high strength-to-weight ratio.'
  },
  {
    id: 'titanium_grade_5',
    name: 'Titanium (Ti-6Al-4V Grade 5)',
    category: 'Titanium',
    elasticModulus: 113.8,
    yieldStrength: 880,
    ultimateStrength: 950,
    density: 4430,
    poissonRatio: 0.34,
    description: 'High-strength aerospace grade with extreme yield threshold and low density.'
  },
  {
    id: 'brass_c360',
    name: 'Free-Cutting Brass (C36000)',
    category: 'Copper Alloys',
    elasticModulus: 97,
    yieldStrength: 310,
    ultimateStrength: 400,
    density: 8500,
    poissonRatio: 0.31,
    description: 'High machinability copper-zinc alloy used in fittings and precision instruments.'
  },
  {
    id: 'carbon_fiber',
    name: 'Carbon Fiber CFRP (Unidirectional)',
    category: 'Composites',
    elasticModulus: 135,
    yieldStrength: 600,
    ultimateStrength: 1500,
    density: 1550,
    poissonRatio: 0.28,
    description: 'Ultra-lightweight composite engineered for racecraft and aerospace structures.'
  },
  {
    id: 'cast_iron_gray',
    name: 'Gray Cast Iron (ASTM Class 20)',
    category: 'Iron',
    elasticModulus: 100,
    yieldStrength: 130,
    ultimateStrength: 200,
    density: 7150,
    poissonRatio: 0.26,
    description: 'High vibration damping alloy used for machine tool beds and heavy housings.'
  },
  {
    id: 'structural_timber',
    name: 'Structural Oak Timber',
    category: 'Wood',
    elasticModulus: 12,
    yieldStrength: 50,
    ultimateStrength: 90,
    density: 720,
    poissonRatio: 0.30,
    description: 'Natural organic fibrous material with high flexural toughness along grain.'
  },
  {
    id: 'pla_polymer',
    name: 'Engineering PLA Polymer',
    category: 'Plastics',
    elasticModulus: 3.5,
    yieldStrength: 45,
    ultimateStrength: 65,
    density: 1240,
    poissonRatio: 0.36,
    description: 'Rigid thermoplastic polymer common in rapid functional prototyping and 3D prints.'
  }
];

export function getMaterialById(id: string): Material {
  const found = MATERIALS.find(m => m.id === id);
  return found || MATERIALS[0];
}
