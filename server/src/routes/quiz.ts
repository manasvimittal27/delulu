import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { quizResponses, userTraits, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { QUIZ_QUESTIONS, VIBE_ARCHETYPES, type TraitKey } from "@delulu/shared";

export const quizRouter = Router();

quizRouter.get("/questions", requireAuth, (_req, res) => {
  res.json({ questions: QUIZ_QUESTIONS });
});

const romanticPrefsSchema = z.object({
  preferredGenders: z.array(z.enum(["male", "female", "non_binary", "prefer_not_to_say"])).min(1),
  ageRangeMin: z.number().int().min(18).max(80),
  ageRangeMax: z.number().int().min(18).max(80),
});

quizRouter.post("/romantic-prefs", requireAuth, async (req, res) => {
  const parsed = romanticPrefsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid preferences" });
  const user = (req as any).user;

  await db
    .update(userTraits)
    .set({
      preferredGenders: parsed.data.preferredGenders,
      ageRangeMin: parsed.data.ageRangeMin,
      ageRangeMax: parsed.data.ageRangeMax,
    })
    .where(eq(userTraits.userId, user.id));

  res.json({ ok: true });
});

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.any(),
});

quizRouter.post("/answer", requireAuth, async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid answer payload" });
  const user = (req as any).user;
  const { questionId, answer } = parsed.data;

  await db
    .insert(quizResponses)
    .values({ userId: user.id, questionId, answer })
    .onConflictDoUpdate({
      target: [quizResponses.userId, quizResponses.questionId],
      set: { answer },
    });

  const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
  if (question && question.type !== "slider") {
    const selectedIds: string[] = Array.isArray(answer) ? answer : [answer];
    const deltas: Partial<Record<TraitKey, number>> = {};
    for (const optId of selectedIds) {
      const opt = question.options.find((o) => o.id === optId);
      for (const d of opt?.traitDeltas ?? []) {
        deltas[d.trait] = (deltas[d.trait] ?? 0) + d.delta;
      }
    }
    if (Object.keys(deltas).length) {
      await applyTraitDeltas(user.id, deltas);
    }
  }

  if (questionId === "personality_dial" && typeof answer === "number") {
    await db
      .update(userTraits)
      .set({ socialEnergy: Math.round(0.4 * answer + 0.6 * (await currentSocialEnergy(user.id))) })
      .where(eq(userTraits.userId, user.id));
  }

  if (questionId === "intent_here_for") {
    await db.update(userTraits).set({ intent: answer }).where(eq(userTraits.userId, user.id));
  }
  if (questionId === "intent_comfort") {
    await db.update(userTraits).set({ groupComfort: answer }).where(eq(userTraits.userId, user.id));
  }
  if (questionId === "interests_categories" && Array.isArray(answer)) {
    const interests: Record<string, string[]> = {};
    for (const cat of answer) interests[cat] = [];
    await db.update(userTraits).set({ interests }).where(eq(userTraits.userId, user.id));
  }

  res.json({ ok: true });
});

async function currentSocialEnergy(userId: string): Promise<number> {
  const [row] = await db.select().from(userTraits).where(eq(userTraits.userId, userId)).limit(1);
  return row?.socialEnergy ?? 50;
}

async function applyTraitDeltas(userId: string, deltas: Partial<Record<TraitKey, number>>) {
  const [row] = await db.select().from(userTraits).where(eq(userTraits.userId, userId)).limit(1);
  if (!row) return;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  await db
    .update(userTraits)
    .set({
      socialEnergy: clamp(row.socialEnergy + (deltas.socialEnergy ?? 0)),
      opennessToNew: clamp(row.opennessToNew + (deltas.opennessToNew ?? 0)),
      humorStyle: clamp(row.humorStyle + (deltas.humorStyle ?? 0)),
      conversationDepth: clamp(row.conversationDepth + (deltas.conversationDepth ?? 0)),
      planningStyle: clamp(row.planningStyle + (deltas.planningStyle ?? 0)),
      valuesScore: clamp(row.valuesScore + (deltas.values ?? 0)),
      lifestyleScore: clamp(row.lifestyleScore + (deltas.lifestyle ?? 0)),
      updatedAt: new Date(),
    })
    .where(eq(userTraits.userId, userId));
}

quizRouter.post("/complete", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [traits] = await db.select().from(userTraits).where(eq(userTraits.userId, user.id)).limit(1);
  if (!traits) return res.status(400).json({ error: "No quiz data" });

  const archetypeIndex = Math.abs(hashCode(user.id)) % VIBE_ARCHETYPES.length;
  const archetype = VIBE_ARCHETYPES[archetypeIndex];

  await db
    .update(userTraits)
    .set({ archetypeId: archetype.id })
    .where(eq(userTraits.userId, user.id));

  await db.update(users).set({ onboardingStep: "avatar", updatedAt: new Date() }).where(eq(users.id, user.id));

  res.json({
    ok: true,
    vibeCard: {
      archetype: archetype.name,
      description: archetype.description,
      topInterests: Object.keys((traits.interests as Record<string, string[]>) ?? {}).slice(0, 3),
      socialEnergy: traits.socialEnergy,
    },
  });
});

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
