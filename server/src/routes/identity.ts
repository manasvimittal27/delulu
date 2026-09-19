import { Router } from "express";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq, ne, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { avatarSelectSchema, usernameSchema } from "@delulu/shared";

export const identityRouter = Router();

const ADJECTIVES = ["velvet", "chaotic", "midnight", "feral", "cosmic", "salty", "dreamy", "jazzy", "unhinged", "wobbly", "spicy", "gremlin"];
const NOUNS = ["penguin", "samosa", "gremlin", "croissant", "otter", "raccoon", "mango", "wizard", "potato", "nebula", "biscuit", "yeti"];

const BANNED_SUBSTRINGS = ["admin", "delulu", "moderator", "support"];

export const AVATARS = [
  "blob", "cat_sunglasses", "alien", "mushroom", "chai_cup", "disco_ball", "frog_bucket_hat",
  "ghost", "robot", "panda", "fox", "owl", "cactus", "cloud", "jellyfish", "penguin_scarf",
  "raccoon", "bear_hoodie", "unicorn", "dino", "bee", "octopus", "koala", "hedgehog",
  "flamingo", "moon_face", "sun_face", "strawberry", "avocado", "donut",
];

identityRouter.get("/avatars", requireAuth, (_req, res) => {
  res.json({ avatars: AVATARS });
});

identityRouter.get("/username/suggest", requireAuth, (_req, res) => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  res.json({ username: `${adj}_${noun}` });
});

identityRouter.get("/username/check", requireAuth, async (req, res) => {
  const candidate = String(req.query.username ?? "");
  const parsed = usernameSchema.safeParse(candidate);
  if (!parsed.success) {
    return res.json({ available: false, reason: parsed.error.issues[0]?.message });
  }
  if (BANNED_SUBSTRINGS.some((b) => candidate.includes(b))) {
    return res.json({ available: false, reason: "That username isn't allowed" });
  }
  const user = (req as any).user;
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, candidate), ne(users.id, user.id)))
    .limit(1);
  res.json({ available: !existing });
});

identityRouter.post("/avatar", requireAuth, async (req, res) => {
  const parsed = avatarSelectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { avatarId, avatarColor, username } = parsed.data;
  if (!AVATARS.includes(avatarId)) {
    return res.status(400).json({ error: "Unknown avatar" });
  }
  if (BANNED_SUBSTRINGS.some((b) => username.includes(b))) {
    return res.status(400).json({ error: "That username isn't allowed" });
  }

  const user = (req as any).user;
  try {
    const [updated] = await db
      .update(users)
      .set({ avatarId, avatarColor, username, onboardingStep: "done", updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    res.json({ ok: true, user: { id: updated.id, username: updated.username, avatarId: updated.avatarId } });
  } catch (e: any) {
    if (String(e?.message ?? "").includes("unique")) {
      return res.status(409).json({ error: "Username taken" });
    }
    throw e;
  }
});
