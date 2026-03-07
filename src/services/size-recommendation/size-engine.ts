/**
 * Size Recommendation Engine
 *
 * Recommends the best clothing size based on body measurements, user profile,
 * and garment metadata (size chart + fit type).
 *
 * HONEST DISCLAIMER:
 * This is a rule-based heuristic engine, NOT a machine-learning model.
 * It uses:
 *   - Body measurement matching against a size chart (measurement-driven)
 *   - BMI-based build estimation (heuristic)
 *   - Fit-type bias (rule-based)
 *   - Height/weight fallback tables when measurements are unavailable (approximation)
 *
 * Results are approximate. Real-world sizing varies between brands, cuts,
 * fabrics, and individual body proportions.
 *
 * Production upgrade path:
 *   - Brand-specific sizing models trained on return/exchange data
 *   - 3D body scan → pattern matching
 *   - User feedback loop to calibrate recommendations over time
 */

import type { BodyMeasurements } from '@/services/body/body-measurements';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Measurements for a single size in a garment's size chart (all in cm). */
export interface SizeChartEntry {
  chest?: number;
  shoulder?: number;
  waist?: number;
  hip?: number;
  length?: number;
}

/** Map of size label → measurements. */
export type SizeChart = Record<string, SizeChartEntry>;

export type FitType = 'slim' | 'regular' | 'oversized';

export type GarmentCategory =
  | 't-shirt' | 'shirt' | 'jacket' | 'hoodie' | 'sweater'
  | 'thobe' | 'abaya' | 'dress' | 'polo'
  | 'other';

export interface GarmentMetadata {
  sizeChart?: SizeChart;
  fitType?: FitType;
  category?: GarmentCategory;
}

export interface UserProfile {
  heightCm: number;
  weightKg: number;
  usualSize?: string;
}

export interface SizeRecommendationInput {
  /** Body measurements from camera landmarks (may be null if unavailable) */
  bodyMeasurements?: BodyMeasurements | null;
  /** User-provided profile */
  userProfile?: UserProfile | null;
  /** Garment metadata including optional size chart */
  garmentMetadata?: GarmentMetadata | null;
}

export interface SizeRecommendation {
  /** Recommended size label (e.g. "M", "L", "52") */
  recommendedSize: string;
  /** Confidence 0–1 (higher = more data was available) */
  confidence: number;
  /** Expected fit outcome */
  fitPrediction: 'tight' | 'slim' | 'regular' | 'relaxed' | 'oversized';
  /** Closest alternative sizes */
  alternatives: string[];
  /** What method was used */
  method: 'chart-match' | 'profile-heuristic' | 'measurements-only' | 'fallback';
  /** Human-readable reasoning */
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Standard letter sizes ordered small → large */
const STANDARD_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL'] as const;

/** Height/weight → size lookup table (heuristic, unisex, approximate) */
const HW_TABLE: Array<{ minBMI: number; maxBMI: number; sizes: Record<string, [number, number]> }> = [
  // Each entry: size → [minHeight, maxHeight] for that BMI range
  // BMI < 18.5 (underweight)
  {
    minBMI: 0, maxBMI: 18.5,
    sizes: {
      'XS': [0, 160], 'S': [155, 170], 'M': [165, 180],
      'L': [175, 195], 'XL': [185, 300],
    },
  },
  // BMI 18.5–25 (normal)
  {
    minBMI: 18.5, maxBMI: 25,
    sizes: {
      'S': [0, 165], 'M': [160, 178], 'L': [173, 188],
      'XL': [183, 300],
    },
  },
  // BMI 25–30 (overweight)
  {
    minBMI: 25, maxBMI: 30,
    sizes: {
      'M': [0, 168], 'L': [163, 180], 'XL': [175, 190],
      'XXL': [185, 300],
    },
  },
  // BMI 30+ (obese)
  {
    minBMI: 30, maxBMI: 100,
    sizes: {
      'L': [0, 170], 'XL': [165, 182], 'XXL': [177, 195],
      'XXXL': [190, 300],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sizeIndex(size: string): number {
  const normalized = size.toUpperCase().trim();
  const idx = STANDARD_SIZES.indexOf(normalized as typeof STANDARD_SIZES[number]);
  // For numeric sizes (e.g. "48", "52"), use the number directly
  if (idx === -1) {
    const num = parseFloat(normalized);
    if (!isNaN(num)) return num;
  }
  return idx >= 0 ? idx : -1;
}

function sizeUp(size: string, chart: SizeChart): string | null {
  const keys = Object.keys(chart);
  const idx = keys.indexOf(size);
  return idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null;
}

function sizeDown(size: string, chart: SizeChart): string | null {
  const keys = Object.keys(chart);
  const idx = keys.indexOf(size);
  return idx > 0 ? keys[idx - 1] : null;
}

function adjacentSizes(size: string, chart: SizeChart): string[] {
  const result: string[] = [];
  const down = sizeDown(size, chart);
  const up = sizeUp(size, chart);
  if (down) result.push(down);
  if (up) result.push(up);
  return result;
}

function computeBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Estimate body measurements in cm from the landmark-based pixel measurements.
 * Uses the same pixel-per-cm conversion as the body-measurements service.
 */
function estimateRealCm(
  measurements: BodyMeasurements,
  heightCm: number,
): { shoulderCm: number; chestCm: number; hipCm: number } {
  // Torso is ~30% of total height
  const estimatedTorsoCm = heightCm * 0.30;
  const pxPerCm = measurements.torsoHeightPx / estimatedTorsoCm;

  if (pxPerCm <= 0) {
    // Fallback: use anatomical averages
    return {
      shoulderCm: heightCm * 0.24,
      chestCm: heightCm * 0.53, // chest circumference ≈ 53% of height
      hipCm: heightCm * 0.50,
    };
  }

  // Shoulder biacromial width → chest circumference estimate
  // Chest circumference ≈ shoulder width × 2.4 (rough anatomical ratio)
  const shoulderCm = measurements.shoulderWidthPx / pxPerCm;
  const chestCm = shoulderCm * 2.4;
  const hipCm = measurements.hipWidthPx / pxPerCm * 2.2;

  return { shoulderCm, chestCm, hipCm };
}

// ---------------------------------------------------------------------------
// FIT TYPE bias: shift the recommended size up or down
// ---------------------------------------------------------------------------

function applyFitBias(
  size: string,
  fitType: FitType | undefined,
  chart: SizeChart,
): { adjusted: string; fitPrediction: SizeRecommendation['fitPrediction'] } {
  if (!fitType || fitType === 'regular') {
    return { adjusted: size, fitPrediction: 'regular' };
  }

  if (fitType === 'slim') {
    // Slim fit: size up one to avoid too-tight
    const up = sizeUp(size, chart);
    return { adjusted: up || size, fitPrediction: 'slim' };
  }

  // Oversized: size down one since garment runs large
  const down = sizeDown(size, chart);
  return { adjusted: down || size, fitPrediction: 'relaxed' };
}

// ---------------------------------------------------------------------------
// Main recommendation function
// ---------------------------------------------------------------------------

/**
 * Recommend a clothing size based on available data.
 *
 * Priority order:
 * 1. Size chart + body measurements (most accurate)
 * 2. Size chart + user profile height/weight (good)
 * 3. Body measurements only with standard size table (approximate)
 * 4. Height/weight fallback table (rough estimate)
 */
export function recommendSize(input: SizeRecommendationInput): SizeRecommendation {
  const { bodyMeasurements, userProfile, garmentMetadata } = input;
  const chart = garmentMetadata?.sizeChart;
  const fitType = garmentMetadata?.fitType;
  const hasChart = chart && Object.keys(chart).length > 0;
  const hasMeasurements = !!bodyMeasurements;
  const hasProfile = !!userProfile && userProfile.heightCm > 0 && userProfile.weightKg > 0;

  // ------------------------------------------------------------------
  // STRATEGY 1: Size chart + body measurements (best path)
  // ------------------------------------------------------------------
  if (hasChart && hasMeasurements && hasProfile) {
    return matchAgainstChart(chart!, bodyMeasurements!, userProfile!, fitType);
  }

  // Size chart + profile only (no landmarks)
  if (hasChart && hasProfile) {
    return matchChartWithProfileOnly(chart!, userProfile!, fitType);
  }

  // ------------------------------------------------------------------
  // STRATEGY 2: No size chart — use body measurements + profile
  // ------------------------------------------------------------------
  if (hasMeasurements && hasProfile) {
    return estimateFromMeasurements(bodyMeasurements!, userProfile!, fitType);
  }

  // ------------------------------------------------------------------
  // STRATEGY 3: Profile-only fallback (height + weight)
  // ------------------------------------------------------------------
  if (hasProfile) {
    return fallbackFromProfile(userProfile!, fitType);
  }

  // ------------------------------------------------------------------
  // STRATEGY 4: Nothing useful — return a generic default
  // ------------------------------------------------------------------
  return {
    recommendedSize: 'M',
    confidence: 0.10,
    fitPrediction: 'regular',
    alternatives: ['S', 'L'],
    method: 'fallback',
    reasoning: 'No body measurements, user profile, or size chart available. Defaulting to M.',
  };
}

// ---------------------------------------------------------------------------
// Strategy implementations
// ---------------------------------------------------------------------------

function matchAgainstChart(
  chart: SizeChart,
  measurements: BodyMeasurements,
  profile: UserProfile,
  fitType?: FitType,
): SizeRecommendation {
  const sizes = Object.keys(chart);
  const realCm = estimateRealCm(measurements, profile.heightCm);
  const bmi = computeBMI(profile.heightCm, profile.weightKg);

  // Score each size by how close the body measurements are to the chart values
  let bestSize = sizes[0];
  let bestScore = Infinity;
  const scores: Record<string, number> = {};

  for (const size of sizes) {
    const entry = chart[size];
    let totalDiff = 0;
    let factors = 0;

    if (entry.shoulder != null) {
      totalDiff += Math.abs(realCm.shoulderCm - entry.shoulder);
      factors++;
    }
    if (entry.chest != null) {
      totalDiff += Math.abs(realCm.chestCm - entry.chest);
      factors++;
    }
    if (entry.hip != null) {
      totalDiff += Math.abs(realCm.hipCm - entry.hip);
      factors++;
    }

    const avgDiff = factors > 0 ? totalDiff / factors : 999;
    scores[size] = avgDiff;

    if (avgDiff < bestScore) {
      bestScore = avgDiff;
      bestSize = size;
    }
  }

  // BMI nudge: if BMI suggests larger build and best size isn't at the top,
  // consider nudging up if the next size is very close in score
  if (bmi >= 27) {
    const up = sizeUp(bestSize, chart);
    if (up && scores[up] != null && scores[up] - bestScore < 3) {
      bestSize = up;
    }
  }

  // Apply fit type bias
  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, chart);

  // Confidence: based on how many chart fields matched and the closeness of fit
  const maxChartFields = Math.max(...sizes.map(s => {
    const e = chart[s];
    return [e.shoulder, e.chest, e.hip, e.waist, e.length].filter(v => v != null).length;
  }));
  const dataRichness = Math.min(1, maxChartFields / 3);
  const closeness = Math.max(0, 1 - bestScore / 15); // 0cm diff = 1.0, 15cm+ = 0
  const confidence = Math.round(Math.min(0.95, (dataRichness * 0.4 + closeness * 0.4 + 0.15)) * 100) / 100;

  return {
    recommendedSize: adjusted,
    confidence,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, chart),
    method: 'chart-match',
    reasoning: `Matched body measurements (shoulder: ~${Math.round(realCm.shoulderCm)}cm, chest: ~${Math.round(realCm.chestCm)}cm) against garment size chart. BMI ${Math.round(bmi)} considered.${fitType && fitType !== 'regular' ? ` Adjusted for ${fitType} fit.` : ''}`,
  };
}

function matchChartWithProfileOnly(
  chart: SizeChart,
  profile: UserProfile,
  fitType?: FitType,
): SizeRecommendation {
  const sizes = Object.keys(chart);
  const bmi = computeBMI(profile.heightCm, profile.weightKg);

  // Without landmark measurements, estimate body dimensions from height/weight/BMI
  // These are population-average heuristics
  const heightM = profile.heightCm / 100;
  const shoulderEstCm = profile.heightCm * 0.24 * (bmi < 25 ? 1.0 : bmi < 30 ? 1.05 : 1.10);
  const chestEstCm = shoulderEstCm * 2.4;
  const hipEstCm = shoulderEstCm * 2.2;

  let bestSize = sizes[Math.floor(sizes.length / 2)]; // default: middle size
  let bestScore = Infinity;

  for (const size of sizes) {
    const entry = chart[size];
    let totalDiff = 0;
    let factors = 0;

    if (entry.shoulder != null) { totalDiff += Math.abs(shoulderEstCm - entry.shoulder); factors++; }
    if (entry.chest != null) { totalDiff += Math.abs(chestEstCm - entry.chest); factors++; }
    if (entry.hip != null) { totalDiff += Math.abs(hipEstCm - entry.hip); factors++; }

    const avgDiff = factors > 0 ? totalDiff / factors : 999;
    if (avgDiff < bestScore) { bestScore = avgDiff; bestSize = size; }
  }

  if (bmi >= 27) {
    const up = sizeUp(bestSize, chart);
    if (up) bestSize = up;
  }

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, chart);

  return {
    recommendedSize: adjusted,
    confidence: Math.round(Math.min(0.70, 0.45 + Math.max(0, 1 - bestScore / 20) * 0.25) * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, chart),
    method: 'chart-match',
    reasoning: `Estimated body dimensions from height (${profile.heightCm}cm) and weight (${profile.weightKg}kg), matched against size chart. No camera measurements — lower accuracy.`,
  };
}

function estimateFromMeasurements(
  measurements: BodyMeasurements,
  profile: UserProfile,
  fitType?: FitType,
): SizeRecommendation {
  const realCm = estimateRealCm(measurements, profile.heightCm);
  const bmi = computeBMI(profile.heightCm, profile.weightKg);

  // Map estimated shoulder width to a standard size
  // Standard shoulder widths (cm): XS≈38, S≈40, M≈44, L≈46, XL≈48, XXL≈50
  const shoulderSizeMap: Array<[string, number]> = [
    ['XS', 38], ['S', 40], ['M', 44], ['L', 46], ['XL', 48], ['XXL', 50], ['XXXL', 53],
  ];

  let bestSize = 'M';
  let bestDiff = Infinity;
  for (const [size, shoulder] of shoulderSizeMap) {
    const diff = Math.abs(realCm.shoulderCm - shoulder);
    if (diff < bestDiff) { bestDiff = diff; bestSize = size; }
  }

  // BMI nudge
  if (bmi >= 28) {
    const idx = shoulderSizeMap.findIndex(([s]) => s === bestSize);
    if (idx >= 0 && idx < shoulderSizeMap.length - 1) {
      bestSize = shoulderSizeMap[idx + 1][0];
    }
  }

  // Build a synthetic chart for fit bias and alternatives
  const syntheticChart: SizeChart = {};
  for (const [s] of shoulderSizeMap) syntheticChart[s] = {};

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, syntheticChart);

  return {
    recommendedSize: adjusted,
    confidence: Math.round(Math.min(0.75, 0.50 + Math.max(0, 1 - bestDiff / 10) * 0.25) * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, syntheticChart),
    method: 'measurements-only',
    reasoning: `Estimated shoulder width ~${Math.round(realCm.shoulderCm)}cm from body landmarks, mapped to standard sizes. No garment size chart was provided — using generic sizing table.`,
  };
}

function fallbackFromProfile(
  profile: UserProfile,
  fitType?: FitType,
): SizeRecommendation {
  const bmi = computeBMI(profile.heightCm, profile.weightKg);

  // Find the BMI bucket
  const bucket = HW_TABLE.find(b => bmi >= b.minBMI && bmi < b.maxBMI) || HW_TABLE[1];

  // Within the bucket, find the size whose height range includes the user's height
  let bestSize = 'M';
  for (const [size, [minH, maxH]] of Object.entries(bucket.sizes)) {
    if (profile.heightCm >= minH && profile.heightCm <= maxH) {
      bestSize = size;
    }
  }

  // If user specified a usual size, use it to calibrate (bump confidence)
  let confidence = 0.40;
  if (profile.usualSize) {
    const normalized = profile.usualSize.toUpperCase().trim();
    const usual = STANDARD_SIZES.includes(normalized as typeof STANDARD_SIZES[number])
      ? normalized
      : null;
    if (usual) {
      // Weighted average: 60% our estimate, 40% their stated size
      // If they match, boost confidence
      if (usual === bestSize) {
        confidence = 0.60;
      } else {
        // If close (within 1 size step), pick the user's size with medium confidence
        const ourIdx = sizeIndex(bestSize);
        const theirIdx = sizeIndex(usual);
        if (ourIdx >= 0 && theirIdx >= 0 && Math.abs(ourIdx - theirIdx) <= 1) {
          bestSize = usual;
          confidence = 0.50;
        }
      }
    }
  }

  // Build synthetic chart for alternatives
  const syntheticChart: SizeChart = {};
  for (const s of STANDARD_SIZES) syntheticChart[s] = {};

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, syntheticChart);

  return {
    recommendedSize: adjusted,
    confidence: Math.round(confidence * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, syntheticChart),
    method: 'profile-heuristic',
    reasoning: `Estimated from height (${profile.heightCm}cm), weight (${profile.weightKg}kg), BMI ~${Math.round(bmi)}.${profile.usualSize ? ` User stated usual size: ${profile.usualSize}.` : ''} No body landmarks or size chart — this is a rough estimate.`,
  };
}
