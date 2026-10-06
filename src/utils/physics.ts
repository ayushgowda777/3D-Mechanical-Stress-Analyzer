/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalyzerParams, AnalysisResults, Material } from '../types/analyzer';

/**
 * Calculates cross-sectional geometric properties
 */
export function calculateCrossSection(params: AnalyzerParams) {
  if (params.crossSection === 'circular') {
    const d = params.diameter; // mm
    const r = d / 2;
    const area = Math.PI * r * r; // mm^2
    const inertia = (Math.PI * Math.pow(d, 4)) / 64; // mm^4 (I_xx = I_yy)
    const c = r; // extreme fiber distance in mm
    const sectionModulus = (Math.PI * Math.pow(d, 3)) / 32; // mm^3
    return {
      area,
      inertia,
      c,
      sectionModulus,
      width: d,
      thickness: d
    };
  } else {
    const b = params.width; // mm (horizontal dimension in cross section)
    const h = params.thickness; // mm (depth in bending direction)
    const area = b * h; // mm^2
    const inertia = (b * Math.pow(h, 3)) / 12; // mm^4 (bending about horizontal axis)
    const c = h / 2; // mm
    const sectionModulus = (b * Math.pow(h, 2)) / 6; // mm^3
    return {
      area,
      inertia,
      c,
      sectionModulus,
      width: b,
      thickness: h
    };
  }
}

/**
 * Computes full beam mechanical response: stresses, deflections, reactions, mass
 */
export function analyzeBeam(params: AnalyzerParams, material: Material): AnalysisResults {
  const { area, inertia, c, sectionModulus, width, thickness } = calculateCrossSection(params);
  const L = params.length; // mm
  const a = Math.min(Math.max(params.forcePosition, 0), L); // mm (force position from x=0)
  const F = Math.abs(params.force); // N
  const E = material.elasticModulus * 1000; // convert GPa to MPa (N/mm^2)

  let maxStress = 0;
  let maxDeflection = 0;
  let maxDeflectionLocation = L;
  let reactionForce = F;
  let reactionMoment = 0;
  let maxStressLocX = 0;

  if (params.supportType === 'cantilever') {
    // Cantilever clamped at x = 0 (root), free at x = L
    // M(x) = F * (a - x) for x in [0, a], and 0 for x > a
    // Maximum bending moment is at root x = 0: M_max = F * a (in N*mm)
    const maxMomentNmm = F * a;
    reactionMoment = (maxMomentNmm) / 1000; // N*m
    reactionForce = F;

    // Maximum normal stress is at root extreme fiber (x = 0, y = ±c)
    maxStress = sectionModulus > 0 ? maxMomentNmm / sectionModulus : 0; // MPa
    maxStressLocX = 0;

    // Deflection at tip:
    // If x <= a: v(x) = (F * x^2 / (6 * E * I)) * (3*a - x)
    // If x > a: v(x) = (F * a^2 / (6 * E * I)) * (3*x - a)
    // Max deflection occurs at tip x = L:
    if (inertia > 0 && E > 0) {
      maxDeflection = (F * Math.pow(a, 2) / (6 * E * inertia)) * (3 * L - a);
    }
    maxDeflectionLocation = L;
  } else {
    // Simply Supported at x = 0 and x = L
    // Reaction forces: R1 at x=0 = F*(L-a)/L, R2 at x=L = F*a/L
    // Maximum moment occurs at x = a: M_max = F * a * (L - a) / L
    const maxMomentNmm = L > 0 ? (F * a * (L - a)) / L : 0;
    reactionMoment = 0;
    reactionForce = F;
    maxStress = sectionModulus > 0 ? maxMomentNmm / sectionModulus : 0;
    maxStressLocX = a;

    // Max deflection approximation for simply supported:
    if (inertia > 0 && E > 0 && L > 0) {
      if (a === L / 2) {
        maxDeflection = (F * Math.pow(L, 3)) / (48 * E * inertia);
        maxDeflectionLocation = L / 2;
      } else {
        // Approximate deflection at load point or center
        const b = L - a;
        maxDeflection = (F * Math.pow(a * b, 2)) / (3 * E * inertia * L);
        maxDeflectionLocation = a;
      }
    }
  }

  // Safety Factor SF = sigma_yield / sigma_max
  const safetyFactor = maxStress > 0 ? material.yieldStrength / maxStress : 999;
  let status: 'safe' | 'warning' | 'failure' = 'safe';
  if (safetyFactor < 1.0) {
    status = 'failure';
  } else if (safetyFactor < 2.0) {
    status = 'warning';
  }

  // Volume in mm^3, convert to m^3 for mass
  const volumeMm3 = area * L;
  const volumeM3 = volumeMm3 * 1e-9;
  const massKg = volumeM3 * material.density;

  return {
    maxStress,
    maxStressLocation: {
      x: maxStressLocX,
      y: c, // Top extreme fiber in bending plane
      z: 0
    },
    maxDeflection,
    maxDeflectionLocation,
    safetyFactor,
    reactionForce,
    reactionMoment,
    momentOfInertia: inertia,
    sectionModulus,
    crossSectionArea: area,
    volume: volumeMm3,
    mass: massKg,
    status
  };
}

/**
 * Computes bending moment M(x) at any position along the length x in [0, L]
 * Returns value in N*mm
 */
export function getBendingMomentAt(x: number, params: AnalyzerParams): number {
  const L = params.length;
  const a = Math.min(Math.max(params.forcePosition, 0), L);
  const F = Math.abs(params.force);

  if (params.supportType === 'cantilever') {
    if (x <= a) {
      return F * (a - x);
    }
    return 0;
  } else {
    // Simply supported
    if (x <= a) {
      return (F * (L - a) * x) / L;
    } else {
      return (F * a * (L - x)) / L;
    }
  }
}

/**
 * Computes shear force V(x) at any position along the length
 * Returns value in N
 */
export function getShearForceAt(x: number, params: AnalyzerParams): number {
  const L = params.length;
  const a = Math.min(Math.max(params.forcePosition, 0), L);
  const F = Math.abs(params.force);

  if (params.supportType === 'cantilever') {
    return x <= a ? F : 0;
  } else {
    const R1 = (F * (L - a)) / L;
    const R2 = (F * a) / L;
    return x < a ? R1 : -R2;
  }
}

/**
 * Computes deflection v(x) at position x in [0, L]
 * Returns deflection in mm (positive downward)
 */
export function getDeflectionAt(x: number, params: AnalyzerParams, material: Material): number {
  const L = params.length;
  const a = Math.min(Math.max(params.forcePosition, 0), L);
  const F = Math.abs(params.force);
  const E = material.elasticModulus * 1000; // MPa
  const { inertia } = calculateCrossSection(params);

  if (inertia <= 0 || E <= 0) return 0;

  if (params.supportType === 'cantilever') {
    if (x <= a) {
      return (F * Math.pow(x, 2) / (6 * E * inertia)) * (3 * a - x);
    } else {
      return (F * Math.pow(a, 2) / (6 * E * inertia)) * (3 * x - a);
    }
  } else {
    // Simply supported beam
    const b = L - a;
    if (x <= a) {
      return (F * b * x / (6 * E * inertia * L)) * (L * L - b * b - x * x);
    } else {
      return (F * a * (L - x) / (6 * E * inertia * L)) * (L * L - a * a - Math.pow(L - x, 2));
    }
  }
}

/**
 * Computes local normal stress at point (x, y)
 * x: position along beam length [0, L]
 * y: vertical distance from neutral axis [-c, +c]
 * Returns stress in MPa
 */
export function getLocalStressAt(x: number, y: number, params: AnalyzerParams): number {
  const { inertia } = calculateCrossSection(params);
  if (inertia <= 0) return 0;
  const M = getBendingMomentAt(x, params); // N*mm
  return Math.abs((M * y) / inertia); // MPa (magnitude of bending stress)
}

/**
 * Maps normalized scalar value [0, 1] to continuous Heat Map RGB color:
 * 0.0 -> Blue (Low stress)
 * 0.5 -> Yellow (Medium stress)
 * 1.0 -> Red (High stress)
 *
 * Smooth gradient interpolation:
 * [0.0 - 0.25]: Blue (#0055ff) -> Cyan (#00d4ff)
 * [0.25 - 0.5]: Cyan (#00d4ff) -> Yellow (#ffd700)
 * [0.5 - 0.75]: Yellow (#ffd700) -> Orange (#ff6b00)
 * [0.75 - 1.0]: Orange (#ff6b00) -> Crimson Red (#ff0022)
 */
export function getHeatMapColor(t: number): { r: number; g: number; b: number; hex: string } {
  const clamped = Math.max(0, Math.min(1, t));

  let r = 0;
  let g = 0;
  let b = 0;

  if (clamped <= 0.25) {
    // Blue (0, 80, 255) to Cyan (0, 220, 255)
    const s = clamped / 0.25;
    r = 0;
    g = 0.3 + 0.55 * s;
    b = 1.0;
  } else if (clamped <= 0.5) {
    // Cyan (0, 220, 255) to Yellow (255, 220, 0)
    const s = (clamped - 0.25) / 0.25;
    r = s;
    g = 0.85 + 0.15 * s;
    b = 1.0 - s;
  } else if (clamped <= 0.75) {
    // Yellow (255, 255, 0) to Orange (255, 120, 0)
    const s = (clamped - 0.5) / 0.25;
    r = 1.0;
    g = 1.0 - 0.55 * s;
    b = 0;
  } else {
    // Orange (255, 115, 0) to Red (255, 20, 30)
    const s = (clamped - 0.75) / 0.25;
    r = 1.0;
    g = 0.45 * (1.0 - s);
    b = 0.1 * s;
  }

  const toHex = (n: number) => {
    const val = Math.round(Math.max(0, Math.min(255, n * 255)));
    return val.toString(16).padStart(2, '0');
  };

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  return { r, g, b, hex };
}
