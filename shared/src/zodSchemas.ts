import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6),
});

export const profileSetupSchema = z.object({
  email: z.string().email(),
  dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]),
  referralCode: z.string().optional(),
  termsAccepted: z.literal(true),
});

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscore only");

export const avatarSelectSchema = z.object({
  avatarId: z.string(),
  avatarColor: z.string(),
  username: usernameSchema,
});

export const bookCafeSlotSchema = z.object({
  date: z.string(),
  window: z.enum(["morning", "afternoon", "evening", "night"]),
  area: z.string(),
  groupSize: z.union([z.literal(4), z.literal(5), z.literal(6), z.literal("surprise")]),
  intent: z.enum(["friendship", "romantic", "both"]),
  groupComfort: z.enum(["mixed", "same_gender", "no_preference"]),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
export type BookCafeSlotInput = z.infer<typeof bookCafeSlotSchema>;
