import type { ScoreBreakdown } from "@delulu/shared";

export interface TraitInput {
  socialEnergy: number;
  opennessToNew: number;
  humorStyle: number;
  conversationDepth: number;
  planningStyle: number;
  valuesScore: number;
  lifestyleScore: number;
  interests: Record<string, string[]>;
  dob: string | null;
}

function clamp01to100(v: number) {
  return Math.max(0, Math.min(100, v));
}

function interestOverlap(a: TraitInput, b: TraitInput): number {
  const aKeys = Object.keys(a.interests ?? {});
  const bKeys = Object.keys(b.interests ?? {});
  if (!aKeys.length || !bKeys.length) return 30;
  const shared = aKeys.filter((k) => bKeys.includes(k)).length;
  const union = new Set([...aKeys, ...bKeys]).size;
  return clamp01to100((shared / union) * 130);
}

/** Rewards a moderate 15-35 point gap; penalizes near-identical or very large gaps. */
function complementaryCurve(a: number, b: number): number {
  const diff = Math.abs(a - b);
  if (diff < 8) return 55 - (8 - diff) * 3;
  if (diff <= 15) return 55 + (diff - 8) * 4;
  if (diff <= 35) return 83 + Math.max(0, 17 - Math.abs(diff - 25));
  return Math.max(20, 90 - (diff - 35) * 2);
}

function personalityFit(a: TraitInput, b: TraitInput): number {
  const socialScore = complementaryCurve(a.socialEnergy, b.socialEnergy);
  const planningScore = complementaryCurve(a.planningStyle, b.planningStyle);
  const humorSim = 100 - Math.abs(a.humorStyle - b.humorStyle) * 0.6;
  const convoSim = 100 - Math.abs(a.conversationDepth - b.conversationDepth) * 0.6;
  return clamp01to100(0.35 * socialScore + 0.25 * planningScore + 0.2 * humorSim + 0.2 * convoSim);
}

function valuesAlignment(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.valuesScore - b.valuesScore) * 0.8);
}

function lifestyleFit(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.lifestyleScore - b.lifestyleScore) * 0.7);
}

function conversationFit(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.conversationDepth - b.conversationDepth) * 0.5);
}

function humorFit(a: TraitInput, b: TraitInput): number {
  return clamp01to100(100 - Math.abs(a.humorStyle - b.humorStyle) * 0.5);
}

function ageOf(dob: string | null): number {
  if (!dob) return 24;
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
}

function ageProximity(a: TraitInput, b: TraitInput): number {
  const diff = Math.abs(ageOf(a.dob) - ageOf(b.dob));
  return clamp01to100(100 - diff * 8);
}

interface ScoreWeights {
  interests: number;
  personality: number;
  values: number;
  lifestyle: number;
  conversation: number;
  humor: number;
  age: number;
}

const CAFE_WEIGHTS: ScoreWeights = { interests: 0.3, personality: 0.2, values: 0.15, lifestyle: 0.12, conversation: 0.1, humor: 0.08, age: 0.05 };
/** Event matching weights everyone already shares the event's interest, so interest overlap counts less and personality fit counts more. */
const EVENT_WEIGHTS: ScoreWeights = { interests: 0.2, personality: 0.3, values: 0.15, lifestyle: 0.13, conversation: 0.12, humor: 0.07, age: 0.03 };

function computePairScore(a: TraitInput, b: TraitInput, weights: ScoreWeights): ScoreBreakdown {
  const interests = interestOverlap(a, b);
  const personality = personalityFit(a, b);
  const values = valuesAlignment(a, b);
  const lifestyle = lifestyleFit(a, b);
  const conversation = conversationFit(a, b);
  const humor = humorFit(a, b);
  const age = ageProximity(a, b);

  const overall =
    weights.interests * interests +
    weights.personality * personality +
    weights.values * values +
    weights.lifestyle * lifestyle +
    weights.conversation * conversation +
    weights.humor * humor +
    weights.age * age;

  return {
    overall: Math.round(clamp01to100(overall)),
    interests: Math.round(interests),
    personality: Math.round(personality),
    values: Math.round(values),
    lifestyle: Math.round(lifestyle),
    conversation: Math.round(conversation),
    humor: Math.round(humor),
    age: Math.round(age),
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
