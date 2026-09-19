import type { users } from "../db/schema";
import type { PublicUser, ReliabilityLabel } from "@delulu/shared";

type UserRow = typeof users.$inferSelect;

export function reliabilityLabel(trustScore: number): ReliabilityLabel {
  if (trustScore >= 85) return "excellent";
  if (trustScore >= 60) return "good";
  return "shaky";
}

export function serializeUser(user: UserRow, revealName = false): PublicUser {
  return {
    id: user.id,
    username: user.username ?? "unnamed",
    avatarId: user.avatarId ?? "blob",
    avatarColor: user.avatarColor ?? "#A78BFA",
    firstName: revealName && user.email ? user.email.split("@")[0] : undefined,
    reliability: reliabilityLabel(user.trustScore),
  };
}

export function serializeSelf(user: UserRow) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    city: user.city,
    gender: user.gender,
    username: user.username,
    avatarId: user.avatarId,
    avatarColor: user.avatarColor,
    onboardingStep: user.onboardingStep,
    trustScore: undefined,
    reliability: reliabilityLabel(user.trustScore),
    strikes: user.strikes,
    creditsPaise: user.creditsPaise,
    role: user.role,
  };
}
