import type { ScoreBreakdown } from "@delulu/shared";

export interface TraitInput {
  // interestVector: sub-interest slug -> weight (1.0) or parent category slug -> weight (0.35)
  interestVector: Record<string, number>;
  conversationDepth: number;
  socialInitiation: number;
  groupEnergyPref: number;
  disagreementTolerance: number;
  spontaneity: number;
  humourStyle: string | null;
  humourEdge: string | null;
  dob: string | null;
}

function clamp01to100(v: number) {
  return Math.max(0, Math.min(100, v));
}

/** Builds a weighted interest vector: 1.0 per sub-interest, 0.35 for the parent category itself. */
export function buildInterestVector(interests: Record<string, string[]>): Record<string, number> {
  const vector: Record<string, number> = {};
  for (const [category, subSlugs] of Object.entries(interests ?? {})) {
    vector[`category:${category}`] = 0.35;
    for (const slug of subSlugs) {
      vector[`sub:${category}:${slug}`] = 1.0;
    }
  }
  return vector;
}

/** Weighted Jaccard overlap on the interest vector (sub-interests carry far more weight than the parent category alone). */
function interestOverlap(a: TraitInput, b: TraitInput): number {
  const keys = new Set([...Object.keys(a.interestVector), ...Object.keys(b.interestVector)]);
  if (!keys.size) return 30;
  let intersection = 0;
  let union = 0;
  for (const k of keys) {
    const av = a.interestVector[k] ?? 0;
    const bv = b.interestVector[k] ?? 0;
    intersection += Math.min(av, bv);
    union += Math.max(av, bv);
  }
  if (!union) return 30;
  return clamp01to100((intersection / union) * 100);
}

function conversationFit(a: TraitInput, b: TraitInput): number {
  const gap = Math.abs(a.conversationDepth - b.conversationDepth);
  const base = 100 - gap;
  // Hard penalty if the gap is large — one wants banter, the other wants depth.
  return clamp01to100(gap > 45 ? base - 20 : base);
}

/** NOT similarity — peaks at a 20-40 point gap (one leads, one follows), falls off when near-identical or too far apart. */
function socialInitiationFit(a: TraitInput, b: TraitInput): number {
  const gap = Math.abs(a.socialInitiation - b.socialInitiation);
  if (gap < 8) return 45;
  if (gap <= 20) return 45 + ((gap - 8) / 12) * 40;
  if (gap <= 40) return 85 + Math.max(0, 15 - Math.abs(gap - 30));
  if (gap <= 55) return Math.max(40, 90 - (gap - 40) * 2);
  return Math.max(15, 60 - (gap - 55) * 1.5);
}

function groupEnergyFit(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.groupEnergyPref - b.groupEnergyPref));
}

const HUMOUR_STYLES = ["absurd", "banter", "dry", "wholesome"];

function humourFit(a: TraitInput, b: TraitInput): number {
  if (!a.humourStyle || !b.humourStyle) return 60;

  let base: number;
  if (a.humourStyle === b.humourStyle) {
    base = 100;
  } else {
    const pairs: Record<string, number> = {
      "absurd|banter": 85,
      "dry|wholesome": 70,
    };
    const key1 = `${a.humourStyle}|${b.humourStyle}`;
    const key2 = `${b.humourStyle}|${a.humourStyle}`;
    base = pairs[key1] ?? pairs[key2] ?? 45;
  }

  // Dark-humour guard: a high-edge person next to a low-edge person is friction, regardless of style match.
  if ((a.humourEdge === "high" && b.humourEdge === "low") || (a.humourEdge === "low" && b.humourEdge === "high")) {
    base -= 25;
  }
  return clamp01to100(base);
}

function disagreementFit(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.disagreementTolerance - b.disagreementTolerance) * 1.2);
}

function spontaneityFit(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.spontaneity - b.spontaneity));
}

interface ScoreWeights {
  interests: number;
  conversation: number;
  socialInitiation: number;
  groupEnergy: number;
  humour: number;
  disagreement: number;
  spontaneity: number;
}

const CAFE_WEIGHTS: ScoreWeights = {
  interests: 0.32,
  conversation: 0.18,
  socialInitiation: 0.14,
  groupEnergy: 0.12,
  humour: 0.1,
  disagreement: 0.08,
  spontaneity: 0.06,
};

/** Event matching: everyone already shares the event's interest, so interest overlap counts for less and personality fit counts for more. */
const EVENT_WEIGHTS: ScoreWeights = {
  interests: 0.18,
  conversation: 0.22,
  socialInitiation: 0.18,
  groupEnergy: 0.16,
  humour: 0.12,
  disagreement: 0.09,
  spontaneity: 0.05,
};

function computePairScore(a: TraitInput, b: TraitInput, weights: ScoreWeights): ScoreBreakdown {
  const interests = interestOverlap(a, b);
  const conversation = conversationFit(a, b);
  const socialInit = socialInitiationFit(a, b);
  const groupEnergy = groupEnergyFit(a, b);
  const humour = humourFit(a, b);
  const disagreement = disagreementFit(a, b);
  const spontaneity = spontaneityFit(a, b);

  const overall =
    weights.interests * interests +
    weights.conversation * conversation +
    weights.socialInitiation * socialInit +
    weights.groupEnergy * groupEnergy +
    weights.humour * humour +
    weights.disagreement * disagreement +
    weights.spontaneity * spontaneity;

  return {
    overall: Math.round(clamp01to100(overall)),
    interests: Math.round(interests),
    conversation: Math.round(conversation),
    socialInitiationFit: Math.round(socialInit),
    groupEnergyFit: Math.round(groupEnergy),
    humourFit: Math.round(humour),
    disagreementFit: Math.round(disagreement),
    spontaneityFit: Math.round(spontaneity),
  };
}

export function pairScore(a: TraitInput, b: TraitInput): ScoreBreakdown {
  return computePairScore(a, b, CAFE_WEIGHTS);
}

export function pairScoreEvent(a: TraitInput, b: TraitInput): ScoreBreakdown {
  return computePairScore(a, b, EVENT_WEIGHTS);
}

/** cohesion = mean(pair scores) - 0.5 * stddev(pair scores) */
export function groupCohesion(pairOveralls: number[]): number {
  if (!pairOveralls.length) return 0;
  const mean = pairOveralls.reduce((a, b) => a + b, 0) / pairOveralls.length;
  const variance = pairOveralls.reduce((sum, v) => sum + (v - mean) ** 2, 0) / pairOveralls.length;
  const stddev = Math.sqrt(variance);
  return Math.round(mean - 0.5 * stddev);
}
