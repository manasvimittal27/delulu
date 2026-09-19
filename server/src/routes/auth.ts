import { Router } from "express";
import { db } from "../db/client";
import { users, userTraits, waitlist } from "../db/schema";
import { eq } from "drizzle-orm";
import { requestOtpSchema, verifyOtpSchema, profileSetupSchema } from "@delulu/shared";
import { issueOtp, verifyOtp } from "../services/otp";
import { rateLimitMiddleware } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { serializeSelf } from "../lib/serialize";

export const authRouter = Router();

authRouter.post("/otp/request", rateLimitMiddleware("otp-request", 5, 10 * 60 * 1000), async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid phone" });
  }
  const { phone } = parsed.data;
  const { devOtp } = await issueOtp(phone);
  res.json({ ok: true, devOtp });
});

authRouter.post("/otp/verify", rateLimitMiddleware("otp-verify", 10, 10 * 60 * 1000), async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { phone, otp } = parsed.data;
  const valid = await verifyOtp(phone, otp);
  if (!valid) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({ phone, onboardingStep: "profile" }).returning();
  }

  req.session.userId = user.id;
  res.json({ ok: true, user: serializeSelf(user) });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json({ user: serializeSelf(user) });
});

authRouter.post("/profile", requireAuth, async (req, res) => {
  const parsed = profileSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { email, dob, pincode, gender, referralCode, termsAccepted } = parsed.data;

  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 18) {
    return res.status(403).json({ error: "Delulu is currently 18+. Come back when you're eligible 🫶" });
  }

  const user = (req as any).user;
  const city = resolveCityFromPincode(pincode);
  if (!city) {
    await db.insert(waitlist).values({ phone: user.phone, city: `Pincode ${pincode}` });
    return res.status(200).json({ ok: false, waitlist: true });
  }

  const [updated] = await db
    .update(users)
    .set({
      email,
      dob,
      pincode,
      gender,
      referralCode,
      city,
      termsAcceptedAt: termsAccepted ? new Date() : null,
      onboardingStep: "quiz",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  await db
    .insert(userTraits)
    .values({ userId: user.id })
    .onConflictDoNothing();

  res.json({ ok: true, user: serializeSelf(updated) });
});

// The product is currently launching across Delhi NCR. We keep the canonical
// city value broad so Delhi, Gurugram, Noida and nearby NCR areas can share
// the same matching pool while their specific locality remains in `area`.
const PINCODE_CITY_MAP: Record<string, string> = {
  "110": "Delhi NCR",
  "121": "Delhi NCR",
  "122": "Delhi NCR",
  "123": "Delhi NCR",
  "124": "Delhi NCR",
  "131": "Delhi NCR",
  "201": "Delhi NCR",
  "250": "Delhi NCR",
};

function resolveCityFromPincode(pincode: string): string | null {
  const prefix3 = pincode.slice(0, 3);
  return PINCODE_CITY_MAP[prefix3] ?? null;
}
