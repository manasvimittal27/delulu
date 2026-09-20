export type Track = "cafe" | "event";

export type TimeWindow = "morning" | "afternoon" | "evening" | "night";

export const TIME_WINDOW_DEFAULTS: Record<TimeWindow, string> = {
  morning: "10:00",
  afternoon: "15:00",
  evening: "18:30",
  night: "20:30",
};

export type Intent = "friendship" | "romantic" | "both" | "vibes";

export type GroupComfort = "mixed" | "same_gender" | "no_preference";

export type ReliabilityLabel = "excellent" | "good" | "shaky";

export interface TraitVector {
  socialEnergy: number;
  opennessToNew: number;
  humorStyle: number;
  conversationDepth: number;
  planningStyle: number;
  values: number;
  lifestyle: number;
  interests: Record<string, string[]>;
}

export interface PublicUser {
  id: string;
  username: string;
  avatarId: string;
  avatarColor: string;
  firstName?: string;
  reliability: ReliabilityLabel;
}

export interface ScoreBreakdown {
  overall: number;
  interests: number;
  conversation: number;
  socialInitiationFit: number;
  groupEnergyFit: number;
  humourFit: number;
  disagreementFit: number;
  spontaneityFit: number;
}
