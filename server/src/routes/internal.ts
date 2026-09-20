import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { venues } from "../db/schema";
import { runSeed } from "../db/seed";

export const internalRouter = Router();

/**
 * One-time production seed trigger, guarded by a token so only whoever holds
 * SEED_TOKEN can call it, and idempotency-guarded so it can never double-seed.
 * Not part of the product surface — safe to leave mounted since it refuses
 * once any user exists.
 */
internalRouter.post("/seed", async (req, res) => {
  const token = req.header("x-seed-token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return res.status(404).json({ error: "Not found" });
  }

  const [existing] = await db.select().from(venues).limit(1);
  if (existing) {
    return res.status(409).json({ error: "Already seeded" });
  }

  await runSeed();
  res.json({ ok: true });
});

/**
 * Wipes all demo/user data and reseeds from scratch. Same token guard as
 * /seed, no idempotency check (that's the point) — this is demo-data
 * infrastructure only, never call it once real users exist.
 */
internalRouter.post("/reset-and-seed", async (req, res) => {
  const token = req.header("x-seed-token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return res.status(404).json({ error: "Not found" });
  }

  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE venues, icebreaker_prompts, meet_slots, match_runs, chat_rooms RESTART IDENTITY CASCADE`);

  await runSeed();
  res.json({ ok: true });
});
