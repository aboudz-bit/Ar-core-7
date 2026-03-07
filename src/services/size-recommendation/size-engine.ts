/**
 * Size Recommendation Engine
 *
 * Recommends the best clothing size based on body measurements, user profile,
 * and garment metadata (size chart + fit type + category + product specs).
 *
 * HONEST DISCLAIMER:
 * This is a rule-based heuristic engine, NOT a machine-learning model.
 * It uses:
 *   - Body measurement matching against a size chart (measurement-driven)
 *   - Category-specific default size charts for thobe, abaya, t-shirt, jacket (heuristic)
 *   - Product-level garment specs when provided (garmentLength, sleeveLength, etc.)
 *   - BMI-based build estimation (heuristic)
 *   - Fit-type bias (rule-based)
 *   - Height/weight fallback tables when measurements are unavailable (approximation)
 *
 * Results are approximate. Real-world sizing varies between brands, cuts,
 * fabrics, and individual body proportions.
 *
 * SEPARATION OF CONCERNS:
 *   - "chart-match": Product-specific size chart provided → direct matching (best accuracy)
 *   - "category-default": Using built-in category default charts (good accuracy for standard sizing)
 *   - "measurements-only": No chart, using generic shoulder→size mapping (moderate accuracy)
 *   - "profile-heuristic": Only height/weight → BMI bucket estimation (low accuracy)
 *   - "fallback": No data at all → default size (very low accuracy)
 *
 * Production upgrade path:
 *   - Brand-specific sizing models trained on return/exchange data
 *   - 3D body scan → pattern matching
 *   - User feedback loop to calibrate recommendations over time
 */

import type { BodyMeasurements } from '@/services/body/body-measurements';

export interface SizeChartEntry {
  chest?: number;
  shoulder?: number;
  waist?: number;
  hip?: number;
  length?: number;
  sleeve?: number;
}

export type SizeChart = Record<string, SizeChartEntry>;

export type FitType = 'slim' | 'regular' | 'oversized' | 'loose';

export type GarmentCategory =
  | 't-shirt' | 'shirt' | 'jacket' | 'hoodie' | 'sweater'
  | 'thobe' | 'abaya' | 'dress' | 'polo'
  | 'other';

export type SizingSystem = 'letter' | 'numeric' | 'custom';

export interface GarmentMetadata {
  sizeChart?: SizeChart;
  fitType?: FitType;
  category?: GarmentCategory;
  sizingSystem?: SizingSystem;
  garmentLength?: number;
  sleeveLength?: number;
  shoulderSpec?: number;
  chestSpec?: number;
}

export interface UserProfile {
  heightCm: number;
  weightKg: number;
  usualSize?: string;
}

export interface SizeRecommendationInput {
  bodyMeasurements?: BodyMeasurements | null;
  userProfile?: UserProfile | null;
  garmentMetadata?: GarmentMetadata | null;
}

export interface SizeRecommendation {
  recommendedSize: string;
  confidence: number;
  fitPrediction: 'tight' | 'slim' | 'regular' | 'relaxed' | 'oversized';
  alternatives: string[];
  method: 'chart-match' | 'profile-heuristic' | 'measurements-only' | 'category-default' | 'fallback';
  reasoning: string;
  category?: GarmentCategory;
  sizingSystem?: SizingSystem;
  dataSource: 'product-specific' | 'category-default' | 'generic-fallback';
  measurementBasis: string;
}

/**
 * THOBE sizing — numeric system (52–64).
 * Based on Gulf/Saudi thobe sizing conventions.
 *
 * Category-specific rules:
 *   Primary factors: height (garment length), shoulder width, sleeve length
 *   Secondary: chest circumference
 *   Thobe length is critical — it must reach near the ankle.
 *
 * HEURISTIC BASIS: Derived from common thobe manufacturer sizing guides.
 * Actual brand sizing varies significantly.
 */
const THOBE_SIZE_CHART: SizeChart = {
  '52': { length: 140, shoulder: 42, chest: 100, sleeve: 60 },
  '54': { length: 143, shoulder: 44, chest: 104, sleeve: 62 },
  '56': { length: 146, shoulder: 46, chest: 108, sleeve: 64 },
  '58': { length: 149, shoulder: 48, chest: 112, sleeve: 66 },
  '60': { length: 152, shoulder: 50, chest: 116, sleeve: 68 },
  '62': { length: 155, shoulder: 52, chest: 120, sleeve: 70 },
  '64': { length: 158, shoulder: 54, chest: 124, sleeve: 72 },
};

/**
 * ABAYA sizing — numeric system (50–60) or letter (S–XXL).
 * Default uses numeric.
 *
 * Category-specific rules:
 *   Primary factors: height (full-body drape length), shoulder width
 *   Abayas are inherently loose — fit type "loose" is the default behavior
 *   Chest is less critical due to the flowing silhouette
 *
 * HEURISTIC BASIS: Based on common abaya sizing from Middle Eastern manufacturers.
 */
const ABAYA_SIZE_CHART: SizeChart = {
  '50': { length: 138, shoulder: 38, chest: 98 },
  '52': { length: 142, shoulder: 40, chest: 102 },
  '54': { length: 146, shoulder: 42, chest: 106 },
  '56': { length: 150, shoulder: 44, chest: 110 },
  '58': { length: 154, shoulder: 46, chest: 114 },
  '60': { length: 158, shoulder: 48, chest: 118 },
};

const ABAYA_LETTER_CHART: SizeChart = {
  'S':   { length: 138, shoulder: 38, chest: 98 },
  'M':   { length: 142, shoulder: 40, chest: 102 },
  'L':   { length: 146, shoulder: 42, chest: 106 },
  'XL':  { length: 150, shoulder: 44, chest: 110 },
  'XXL': { length: 154, shoulder: 46, chest: 114 },
};

/**
 * T-SHIRT sizing — letter system (XS–XXXL).
 *
 * Category-specific rules:
 *   Primary factors: shoulder width, chest circumference
 *   Secondary: fit type adjustment (slim = size down, oversized = size up)
 *   Length is less critical for t-shirts
 *
 * HEURISTIC BASIS: Based on ISO 8559 body measurement standards,
 * adapted for retail t-shirt sizing.
 */
const TSHIRT_SIZE_CHART: SizeChart = {
  'XS':   { shoulder: 40, chest: 86,  length: 66, sleeve: 18 },
  'S':    { shoulder: 42, chest: 92,  length: 69, sleeve: 19 },
  'M':    { shoulder: 44, chest: 98,  length: 72, sleeve: 20 },
  'L':    { shoulder: 47, chest: 104, length: 75, sleeve: 21 },
  'XL':   { shoulder: 50, chest: 112, length: 78, sleeve: 22 },
  'XXL':  { shoulder: 53, chest: 120, length: 81, sleeve: 23 },
  'XXXL': { shoulder: 56, chest: 128, length: 84, sleeve: 24 },
};

/**
 * JACKET sizing — letter system (XS–XXXL).
 *
 * Category-specific rules:
 *   Primary factors: shoulder width, chest circumference, sleeve length
 *   Jackets run ~2cm wider per size than t-shirts
 *   Sleeve length matters more than for t-shirts (full-length sleeves)
 *
 * HEURISTIC BASIS: Based on outerwear sizing conventions.
 */
const JACKET_SIZE_CHART: SizeChart = {
  'XS':   { shoulder: 42, chest: 92,  length: 64, sleeve: 62 },
  'S':    { shoulder: 44, chest: 98,  length: 67, sleeve: 64 },
  'M':    { shoulder: 46, chest: 104, length: 70, sleeve: 66 },
  'L':    { shoulder: 49, chest: 110, length: 73, sleeve: 68 },
  'XL':   { shoulder: 52, chest: 118, length: 76, sleeve: 70 },
  'XXL':  { shoulder: 55, chest: 126, length: 79, sleeve: 72 },
  'XXXL': { shoulder: 58, chest: 134, length: 82, sleeve: 74 },
};

const DEFAULT_CHARTS: Partial<Record<GarmentCategory, SizeChart>> = {
  'thobe': THOBE_SIZE_CHART,
  'abaya': ABAYA_SIZE_CHART,
  't-shirt': TSHIRT_SIZE_CHART,
  'jacket': JACKET_SIZE_CHART,
  'shirt': TSHIRT_SIZE_CHART,
  'hoodie': JACKET_SIZE_CHART,
  'sweater': JACKET_SIZE_CHART,
  'polo': TSHIRT_SIZE_CHART,
};

function getDefaultSizingSystem(category: GarmentCategory): SizingSystem {
  if (category === 'thobe' || category === 'abaya') return 'numeric';
  return 'letter';
}

const STANDARD_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL'] as const;

const HW_TABLE: Array<{ minBMI: number; maxBMI: number; sizes: Record<string, [number, number]> }> = [
  {
    minBMI: 0, maxBMI: 18.5,
    sizes: {
      'XS': [0, 160], 'S': [155, 170], 'M': [165, 180],
      'L': [175, 195], 'XL': [185, 300],
    },
  },
  {
    minBMI: 18.5, maxBMI: 25,
    sizes: {
      'S': [0, 165], 'M': [160, 178], 'L': [173, 188],
      'XL': [183, 300],
    },
  },
  {
    minBMI: 25, maxBMI: 30,
    sizes: {
      'M': [0, 168], 'L': [163, 180], 'XL': [175, 190],
      'XXL': [185, 300],
    },
  },
  {
    minBMI: 30, maxBMI: 100,
    sizes: {
      'L': [0, 170], 'XL': [165, 182], 'XXL': [177, 195],
      'XXXL': [190, 300],
    },
  },
];

function sizeIndex(size: string): number {
  const normalized = size.toUpperCase().trim();
  const idx = STANDARD_SIZES.indexOf(normalized as typeof STANDARD_SIZES[number]);
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

function estimateRealCm(
  measurements: BodyMeasurements,
  heightCm: number,
): { shoulderCm: number; chestCm: number; hipCm: number; armLengthCm: number; torsoLengthCm: number } {
  const estimatedTorsoCm = heightCm * 0.30;
  const pxPerCm = measurements.torsoHeightPx / estimatedTorsoCm;

  if (pxPerCm <= 0) {
    return {
      shoulderCm: heightCm * 0.24,
      chestCm: heightCm * 0.53,
      hipCm: heightCm * 0.50,
      armLengthCm: heightCm * 0.36,
      torsoLengthCm: estimatedTorsoCm,
    };
  }

  const shoulderCm = measurements.shoulderWidthPx / pxPerCm;
  const chestCm = shoulderCm * 2.4;
  const hipCm = measurements.hipWidthPx / pxPerCm * 2.2;
  const armLengthCm = measurements.armLengthPx / pxPerCm;
  const torsoLengthCm = estimatedTorsoCm;

  return { shoulderCm, chestCm, hipCm, armLengthCm, torsoLengthCm };
}

interface ScoringWeights {
  shoulder: number;
  chest: number;
  hip: number;
  length: number;
  sleeve: number;
}

/**
 * Category-specific scoring weights.
 *
 * These weights determine which body measurements matter most for each category:
 *
 * THOBE: Length is most important (full-body garment), then shoulder + sleeve.
 *        Chest is secondary because thobes have generous chest ease.
 *
 * ABAYA: Length is most important (must drape to ankle), then shoulder.
 *        Chest/sleeve are less important due to loose, flowing cut.
 *
 * T-SHIRT/SHIRT/POLO: Shoulder and chest are primary (fitted upper body).
 *        Length and sleeve are short, so less variation between sizes.
 *
 * JACKET/HOODIE/SWEATER: Shoulder and chest are primary, but sleeve
 *        length matters more than t-shirts (full-length sleeves).
 */
function getCategoryWeights(category?: GarmentCategory): ScoringWeights {
  switch (category) {
    case 'thobe':
      return { shoulder: 1.5, chest: 1.0, hip: 0.3, length: 2.0, sleeve: 1.2 };
    case 'abaya':
      return { shoulder: 1.2, chest: 0.8, hip: 0.4, length: 2.5, sleeve: 0.3 };
    case 'jacket':
    case 'hoodie':
    case 'sweater':
      return { shoulder: 1.5, chest: 1.5, hip: 0.5, length: 0.8, sleeve: 1.0 };
    case 't-shirt':
    case 'shirt':
    case 'polo':
    default:
      return { shoulder: 1.5, chest: 1.5, hip: 0.5, length: 0.5, sleeve: 0.3 };
  }
}

/**
 * Estimate expected garment length based on user height and category.
 * Product-level garmentLength overrides this when provided.
 *
 * HEURISTIC: Based on proportional body segmentation.
 */
function estimateGarmentLength(heightCm: number, category?: GarmentCategory, garmentLengthSpec?: number): number {
  if (garmentLengthSpec && garmentLengthSpec > 0) return garmentLengthSpec;

  switch (category) {
    case 'thobe':
      return heightCm * 0.85;
    case 'abaya':
      return heightCm * 0.83;
    case 'dress':
      return heightCm * 0.60;
    case 'jacket':
    case 'hoodie':
      return heightCm * 0.40;
    default:
      return heightCm * 0.42;
  }
}

function applyFitBias(
  size: string,
  fitType: FitType | undefined,
  chart: SizeChart,
  category?: GarmentCategory,
): { adjusted: string; fitPrediction: SizeRecommendation['fitPrediction'] } {
  if (!fitType || fitType === 'regular') {
    return { adjusted: size, fitPrediction: 'regular' };
  }

  if (fitType === 'slim') {
    const up = sizeUp(size, chart);
    return { adjusted: up || size, fitPrediction: 'slim' };
  }

  if (fitType === 'loose' || fitType === 'oversized') {
    if (category === 'abaya') {
      return { adjusted: size, fitPrediction: 'relaxed' };
    }
    const down = sizeDown(size, chart);
    return { adjusted: down || size, fitPrediction: 'relaxed' };
  }

  return { adjusted: size, fitPrediction: 'regular' };
}

function inferSizingSystem(chart: SizeChart): SizingSystem {
  const keys = Object.keys(chart);
  const allNumeric = keys.every(k => /^\d+$/.test(k.trim()));
  if (allNumeric) return 'numeric';
  const allLetter = keys.every(k => STANDARD_SIZES.includes(k.toUpperCase().trim() as typeof STANDARD_SIZES[number]));
  if (allLetter) return 'letter';
  return 'custom';
}

function resolveChart(meta?: GarmentMetadata | null): { chart: SizeChart | null; source: 'custom' | 'category-default' | 'none'; category?: GarmentCategory } {
  const category = meta?.category;
  if (meta?.sizeChart && Object.keys(meta.sizeChart).length > 0) {
    return { chart: meta.sizeChart, source: 'custom', category };
  }
  if (category === 'abaya' && meta?.sizingSystem === 'letter') {
    return { chart: ABAYA_LETTER_CHART, source: 'category-default', category };
  }
  if (category && DEFAULT_CHARTS[category]) {
    return { chart: DEFAULT_CHARTS[category]!, source: 'category-default', category };
  }
  return { chart: null, source: 'none', category };
}

function describeDataSource(chartSource: string): SizeRecommendation['dataSource'] {
  if (chartSource === 'custom') return 'product-specific';
  if (chartSource === 'category-default') return 'category-default';
  return 'generic-fallback';
}

function describeMeasurementBasis(
  hasMeasurements: boolean,
  hasProfile: boolean,
  category?: GarmentCategory,
  specs?: GarmentMetadata | null,
): string {
  const parts: string[] = [];

  if (hasMeasurements) parts.push('camera-detected body landmarks');
  if (hasProfile) parts.push('user-provided height/weight');

  if (specs?.garmentLength) parts.push(`product garment length: ${specs.garmentLength}cm`);
  if (specs?.sleeveLength) parts.push(`product sleeve length: ${specs.sleeveLength}cm`);
  if (specs?.shoulderSpec) parts.push(`product shoulder spec: ${specs.shoulderSpec}cm`);
  if (specs?.chestSpec) parts.push(`product chest spec: ${specs.chestSpec}cm`);

  if (parts.length === 0) parts.push('no measurements available');

  return parts.join(', ');
}

function categoryMeasurementExplanation(category?: GarmentCategory): string {
  switch (category) {
    case 'thobe':
      return 'Thobe sizing considers: height (garment length to ankle), shoulder width, torso height, arm length (full sleeve).';
    case 'abaya':
      return 'Abaya sizing considers: height (full drape length), shoulder width. Loose/flowing fit is inherent.';
    case 't-shirt':
    case 'shirt':
    case 'polo':
      return 'T-shirt/shirt sizing considers: shoulder width, chest circumference, fit type preference.';
    case 'jacket':
    case 'hoodie':
    case 'sweater':
      return 'Jacket/outerwear sizing considers: shoulder width, chest circumference, sleeve length.';
    default:
      return 'Generic sizing based on shoulder width and chest approximation.';
  }
}

export function recommendSize(input: SizeRecommendationInput): SizeRecommendation {
  const { bodyMeasurements, userProfile, garmentMetadata } = input;
  const { chart, source: chartSource, category } = resolveChart(garmentMetadata);
  const fitType = garmentMetadata?.fitType;
  const sizingSystem = garmentMetadata?.sizingSystem
    || (chart ? inferSizingSystem(chart) : null)
    || (category ? getDefaultSizingSystem(category) : 'letter');
  const hasChart = !!chart;
  const hasMeasurements = !!bodyMeasurements;
  const hasProfile = !!userProfile && userProfile.heightCm > 0 && userProfile.weightKg > 0;

  if (hasChart && hasMeasurements && hasProfile) {
    return matchAgainstChart(chart!, bodyMeasurements!, userProfile!, fitType, category, chartSource, sizingSystem, garmentMetadata);
  }

  if (hasChart && hasProfile) {
    return matchChartWithProfileOnly(chart!, userProfile!, fitType, category, chartSource, sizingSystem, garmentMetadata);
  }

  if (hasChart && hasMeasurements) {
    return matchChartMeasurementsOnly(chart!, bodyMeasurements!, fitType, category, chartSource, sizingSystem, garmentMetadata);
  }

  if (hasMeasurements && hasProfile) {
    return estimateFromMeasurements(bodyMeasurements!, userProfile!, fitType, category, sizingSystem, garmentMetadata);
  }

  if (hasProfile) {
    return fallbackFromProfile(userProfile!, fitType, category, sizingSystem, garmentMetadata);
  }

  const defaultSize = sizingSystem === 'numeric' ? (category === 'thobe' ? '56' : '54') : 'M';
  const defaultAlts = sizingSystem === 'numeric'
    ? (category === 'thobe' ? ['54', '58'] : ['52', '56'])
    : ['S', 'L'];

  return {
    recommendedSize: defaultSize,
    confidence: 0.10,
    fitPrediction: 'regular',
    alternatives: defaultAlts,
    method: 'fallback',
    reasoning: `No body measurements, user profile, or size chart available. Defaulting to ${defaultSize}. ${categoryMeasurementExplanation(category)}`,
    category,
    sizingSystem,
    dataSource: 'generic-fallback',
    measurementBasis: 'no measurements available',
  };
}

function scoreSize(
  entry: SizeChartEntry,
  realCm: ReturnType<typeof estimateRealCm>,
  heightCm: number,
  weights: ScoringWeights,
  category?: GarmentCategory,
  specs?: GarmentMetadata | null,
): { score: number; factors: number } {
  let totalWeightedDiff = 0;
  let totalWeight = 0;

  const effectiveShoulder = specs?.shoulderSpec || realCm.shoulderCm;
  const effectiveChest = specs?.chestSpec || realCm.chestCm;

  if (entry.shoulder != null) {
    totalWeightedDiff += Math.abs(effectiveShoulder - entry.shoulder) * weights.shoulder;
    totalWeight += weights.shoulder;
  }
  if (entry.chest != null) {
    totalWeightedDiff += Math.abs(effectiveChest - entry.chest) * weights.chest;
    totalWeight += weights.chest;
  }
  if (entry.hip != null) {
    totalWeightedDiff += Math.abs(realCm.hipCm - entry.hip) * weights.hip;
    totalWeight += weights.hip;
  }
  if (entry.length != null) {
    const estimatedLength = estimateGarmentLength(heightCm, category, specs?.garmentLength);
    totalWeightedDiff += Math.abs(estimatedLength - entry.length) * weights.length;
    totalWeight += weights.length;
  }
  if (entry.sleeve != null) {
    const effectiveSleeve = specs?.sleeveLength || realCm.armLengthCm;
    totalWeightedDiff += Math.abs(effectiveSleeve - entry.sleeve) * weights.sleeve;
    totalWeight += weights.sleeve;
  }

  const avgDiff = totalWeight > 0 ? totalWeightedDiff / totalWeight : 999;
  return { score: avgDiff, factors: totalWeight > 0 ? Math.round(totalWeight) : 0 };
}

function matchAgainstChart(
  chart: SizeChart,
  measurements: BodyMeasurements,
  profile: UserProfile,
  fitType?: FitType,
  category?: GarmentCategory,
  chartSource?: string,
  sizingSystem?: SizingSystem,
  specs?: GarmentMetadata | null,
): SizeRecommendation {
  const sizes = Object.keys(chart);
  const realCm = estimateRealCm(measurements, profile.heightCm);
  const bmi = computeBMI(profile.heightCm, profile.weightKg);
  const weights = getCategoryWeights(category);

  let bestSize = sizes[0];
  let bestScore = Infinity;
  const scores: Record<string, number> = {};

  for (const size of sizes) {
    const entry = chart[size];
    const { score } = scoreSize(entry, realCm, profile.heightCm, weights, category, specs);
    scores[size] = score;
    if (score < bestScore) {
      bestScore = score;
      bestSize = size;
    }
  }

  if (bmi >= 27) {
    const up = sizeUp(bestSize, chart);
    if (up && scores[up] != null && scores[up] - bestScore < 3) {
      bestSize = up;
    }
  }

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, chart, category);

  const maxChartFields = Math.max(...sizes.map(s => {
    const e = chart[s];
    return [e.shoulder, e.chest, e.hip, e.waist, e.length, e.sleeve].filter(v => v != null).length;
  }));
  const dataRichness = Math.min(1, maxChartFields / 3);
  const closeness = Math.max(0, 1 - bestScore / 15);
  const sourceBonus = chartSource === 'custom' ? 0.05 : 0;
  const specsBonus = (specs?.garmentLength || specs?.sleeveLength || specs?.shoulderSpec || specs?.chestSpec) ? 0.03 : 0;
  const confidence = Math.round(Math.min(0.95, (dataRichness * 0.4 + closeness * 0.4 + 0.15 + sourceBonus + specsBonus)) * 100) / 100;

  const categoryLabel = category && category !== 'other' ? ` for ${category}` : '';
  const chartLabel = chartSource === 'custom' ? 'product-specific' : 'category-default';
  const measurementDetails = buildMeasurementDetails(realCm, profile.heightCm, category, specs);

  return {
    recommendedSize: adjusted,
    confidence,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, chart),
    method: chartSource === 'category-default' ? 'category-default' : 'chart-match',
    reasoning: `Matched body measurements (${measurementDetails}) against ${chartLabel} size chart${categoryLabel}. BMI ${Math.round(bmi)} considered.${fitType && fitType !== 'regular' ? ` Adjusted for ${fitType} fit.` : ''} ${categoryMeasurementExplanation(category)} [Heuristic: rule-based measurement matching, not ML.]`,
    category,
    sizingSystem,
    dataSource: describeDataSource(chartSource || 'none'),
    measurementBasis: describeMeasurementBasis(true, true, category, specs),
  };
}

function buildMeasurementDetails(
  realCm: ReturnType<typeof estimateRealCm>,
  heightCm: number,
  category?: GarmentCategory,
  specs?: GarmentMetadata | null,
): string {
  const parts: string[] = [];

  switch (category) {
    case 'thobe':
      parts.push(`shoulder: ~${Math.round(specs?.shoulderSpec || realCm.shoulderCm)}cm`);
      parts.push(`est. garment length: ~${Math.round(estimateGarmentLength(heightCm, category, specs?.garmentLength))}cm`);
      parts.push(`sleeve: ~${Math.round(specs?.sleeveLength || realCm.armLengthCm)}cm`);
      if (specs?.chestSpec) parts.push(`chest: ${specs.chestSpec}cm (product spec)`);
      break;
    case 'abaya':
      parts.push(`shoulder: ~${Math.round(specs?.shoulderSpec || realCm.shoulderCm)}cm`);
      parts.push(`est. length: ~${Math.round(estimateGarmentLength(heightCm, category, specs?.garmentLength))}cm`);
      break;
    case 'jacket':
    case 'hoodie':
    case 'sweater':
      parts.push(`shoulder: ~${Math.round(specs?.shoulderSpec || realCm.shoulderCm)}cm`);
      parts.push(`chest: ~${Math.round(specs?.chestSpec || realCm.chestCm)}cm`);
      parts.push(`sleeve: ~${Math.round(specs?.sleeveLength || realCm.armLengthCm)}cm`);
      break;
    default:
      parts.push(`shoulder: ~${Math.round(specs?.shoulderSpec || realCm.shoulderCm)}cm`);
      parts.push(`chest: ~${Math.round(specs?.chestSpec || realCm.chestCm)}cm`);
      break;
  }

  return parts.join(', ');
}

function matchChartWithProfileOnly(
  chart: SizeChart,
  profile: UserProfile,
  fitType?: FitType,
  category?: GarmentCategory,
  chartSource?: string,
  sizingSystem?: SizingSystem,
  specs?: GarmentMetadata | null,
): SizeRecommendation {
  const sizes = Object.keys(chart);
  const bmi = computeBMI(profile.heightCm, profile.weightKg);
  const weights = getCategoryWeights(category);

  const shoulderEstCm = specs?.shoulderSpec || (profile.heightCm * 0.24 * (bmi < 25 ? 1.0 : bmi < 30 ? 1.05 : 1.10));
  const chestEstCm = specs?.chestSpec || (shoulderEstCm * 2.4);
  const hipEstCm = shoulderEstCm * 2.2;
  const armLengthCm = specs?.sleeveLength || (profile.heightCm * 0.36);
  const torsoLengthCm = profile.heightCm * 0.30;

  const syntheticRealCm = { shoulderCm: shoulderEstCm, chestCm: chestEstCm, hipCm: hipEstCm, armLengthCm, torsoLengthCm };

  let bestSize = sizes[Math.floor(sizes.length / 2)];
  let bestScore = Infinity;

  for (const size of sizes) {
    const entry = chart[size];
    const { score } = scoreSize(entry, syntheticRealCm, profile.heightCm, weights, category, specs);
    if (score < bestScore) { bestScore = score; bestSize = size; }
  }

  if (bmi >= 27) {
    const up = sizeUp(bestSize, chart);
    if (up) bestSize = up;
  }

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, chart, category);
  const categoryLabel = category && category !== 'other' ? ` for ${category}` : '';
  const chartLabel = chartSource === 'custom' ? 'product-specific' : 'category-default';
  const hasSpecs = !!(specs?.garmentLength || specs?.sleeveLength || specs?.shoulderSpec || specs?.chestSpec);

  return {
    recommendedSize: adjusted,
    confidence: Math.round(Math.min(0.70, 0.45 + Math.max(0, 1 - bestScore / 20) * 0.25 + (hasSpecs ? 0.03 : 0)) * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, chart),
    method: chartSource === 'category-default' ? 'category-default' : 'chart-match',
    reasoning: `Estimated body dimensions from height (${profile.heightCm}cm) and weight (${profile.weightKg}kg), matched against ${chartLabel} size chart${categoryLabel}. No camera measurements — lower accuracy. ${categoryMeasurementExplanation(category)} [Heuristic: BMI + height-proportional estimation.]`,
    category,
    sizingSystem,
    dataSource: describeDataSource(chartSource || 'none'),
    measurementBasis: describeMeasurementBasis(false, true, category, specs),
  };
}

function matchChartMeasurementsOnly(
  chart: SizeChart,
  measurements: BodyMeasurements,
  fitType?: FitType,
  category?: GarmentCategory,
  chartSource?: string,
  sizingSystem?: SizingSystem,
  specs?: GarmentMetadata | null,
): SizeRecommendation {
  const sizes = Object.keys(chart);
  const weights = getCategoryWeights(category);
  const fallbackHeight = 172;
  const realCm = estimateRealCm(measurements, fallbackHeight);

  let bestSize = sizes[Math.floor(sizes.length / 2)];
  let bestScore = Infinity;

  for (const size of sizes) {
    const entry = chart[size];
    const { score } = scoreSize(entry, realCm, fallbackHeight, weights, category, specs);
    if (score < bestScore) { bestScore = score; bestSize = size; }
  }

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, chart, category);
  const categoryLabel = category && category !== 'other' ? ` for ${category}` : '';

  return {
    recommendedSize: adjusted,
    confidence: Math.round(Math.min(0.60, 0.35 + Math.max(0, 1 - bestScore / 20) * 0.25) * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, chart),
    method: chartSource === 'category-default' ? 'category-default' : 'chart-match',
    reasoning: `Matched landmark-based proportions against size chart${categoryLabel}. No height/weight profile provided — using proportional estimates only. ${categoryMeasurementExplanation(category)} [Heuristic: landmark ratios with assumed average height.]`,
    category,
    sizingSystem,
    dataSource: describeDataSource(chartSource || 'none'),
    measurementBasis: describeMeasurementBasis(true, false, category, specs),
  };
}

function estimateFromMeasurements(
  measurements: BodyMeasurements,
  profile: UserProfile,
  fitType?: FitType,
  category?: GarmentCategory,
  sizingSystem?: SizingSystem,
  specs?: GarmentMetadata | null,
): SizeRecommendation {
  if (category && DEFAULT_CHARTS[category]) {
    return matchAgainstChart(DEFAULT_CHARTS[category]!, measurements, profile, fitType, category, 'category-default', sizingSystem, specs);
  }

  const realCm = estimateRealCm(measurements, profile.heightCm);
  const bmi = computeBMI(profile.heightCm, profile.weightKg);

  const shoulderSizeMap: Array<[string, number]> = [
    ['XS', 38], ['S', 40], ['M', 44], ['L', 46], ['XL', 48], ['XXL', 50], ['XXXL', 53],
  ];

  const effectiveShoulder = specs?.shoulderSpec || realCm.shoulderCm;

  let bestSize = 'M';
  let bestDiff = Infinity;
  for (const [size, shoulder] of shoulderSizeMap) {
    const diff = Math.abs(effectiveShoulder - shoulder);
    if (diff < bestDiff) { bestDiff = diff; bestSize = size; }
  }

  if (bmi >= 28) {
    const idx = shoulderSizeMap.findIndex(([s]) => s === bestSize);
    if (idx >= 0 && idx < shoulderSizeMap.length - 1) {
      bestSize = shoulderSizeMap[idx + 1][0];
    }
  }

  const syntheticChart: SizeChart = {};
  for (const [s] of shoulderSizeMap) syntheticChart[s] = {};

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, syntheticChart, category);

  return {
    recommendedSize: adjusted,
    confidence: Math.round(Math.min(0.75, 0.50 + Math.max(0, 1 - bestDiff / 10) * 0.25) * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, syntheticChart),
    method: 'measurements-only',
    reasoning: `Estimated shoulder width ~${Math.round(effectiveShoulder)}cm from body landmarks, mapped to standard sizes. No garment size chart was provided — using generic sizing table. ${categoryMeasurementExplanation(category)} [Heuristic: shoulder width → size mapping.]`,
    category,
    sizingSystem,
    dataSource: 'generic-fallback',
    measurementBasis: describeMeasurementBasis(true, true, category, specs),
  };
}

function fallbackFromProfile(
  profile: UserProfile,
  fitType?: FitType,
  category?: GarmentCategory,
  sizingSystem?: SizingSystem,
  specs?: GarmentMetadata | null,
): SizeRecommendation {
  const bmi = computeBMI(profile.heightCm, profile.weightKg);

  if (category && DEFAULT_CHARTS[category]) {
    const chart = DEFAULT_CHARTS[category]!;
    return matchChartWithProfileOnly(chart, profile, fitType, category, 'category-default', sizingSystem, specs);
  }

  const bucket = HW_TABLE.find(b => bmi >= b.minBMI && bmi < b.maxBMI) || HW_TABLE[1];

  let bestSize = 'M';
  for (const [size, [minH, maxH]] of Object.entries(bucket.sizes)) {
    if (profile.heightCm >= minH && profile.heightCm <= maxH) {
      bestSize = size;
    }
  }

  let confidence = 0.40;
  if (profile.usualSize) {
    const normalized = profile.usualSize.toUpperCase().trim();
    const usual = STANDARD_SIZES.includes(normalized as typeof STANDARD_SIZES[number])
      ? normalized
      : null;
    if (usual) {
      if (usual === bestSize) {
        confidence = 0.60;
      } else {
        const ourIdx = sizeIndex(bestSize);
        const theirIdx = sizeIndex(usual);
        if (ourIdx >= 0 && theirIdx >= 0 && Math.abs(ourIdx - theirIdx) <= 1) {
          bestSize = usual;
          confidence = 0.50;
        }
      }
    }
  }

  const syntheticChart: SizeChart = {};
  for (const s of STANDARD_SIZES) syntheticChart[s] = {};

  const { adjusted, fitPrediction } = applyFitBias(bestSize, fitType, syntheticChart, category);

  return {
    recommendedSize: adjusted,
    confidence: Math.round(confidence * 100) / 100,
    fitPrediction,
    alternatives: adjacentSizes(adjusted, syntheticChart),
    method: 'profile-heuristic',
    reasoning: `Estimated from height (${profile.heightCm}cm), weight (${profile.weightKg}kg), BMI ~${Math.round(bmi)}.${profile.usualSize ? ` User stated usual size: ${profile.usualSize}.` : ''} No body landmarks or size chart — this is a rough estimate. ${categoryMeasurementExplanation(category)} [Heuristic: BMI-bucket + height-range table.]`,
    category,
    sizingSystem,
    dataSource: 'generic-fallback',
    measurementBasis: describeMeasurementBasis(false, true, category, specs),
  };
}
