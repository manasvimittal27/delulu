import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { quizResponses, userTraits, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import {
  QUIZ_QUESTIONS,
  PERSONALITY_QUESTIONS,
  SUB_INTERESTS,
  VIBE_ARCHETYPES,
  HUMOUR_EDGE_HIGH_SLUGS,
  HUMOUR_EDGE_LOW_SLUGS,
  chooseArchetype,
  type PersonalityNumericTrait,
} from "@delulu/shared";

export const quizRouter = Router();

quizRouter.get("/questions", requireAuth, (_req, res) => {
  res.json({ questions: QUIZ_QUESTIONS, personalityQuestions: PERSONALITY_QUESTIONS, subInterests: SUB_INTERESTS });
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

const NUMERIC_TRAIT_COLUMN: Record<PersonalityNumericTrait, keyof typeof userTraits.$inferInsert> = {
  socialInitiation: "socialInitiation",
  conversationDepth: "conversationDepth",
  disagreementTolerance: "disagreementTolerance",
  spontaneity: "spontaneity",
  groupEnergyPref: "groupEnergyPref",
  adaptability: "adaptability",
  humourEngagement: "humourEngagement",
};

// How many *other* personality-question answers have already landed on this
// trait for this user, so blending a new question's nudge in doesn't wash
// out a trait that's only ever set by one question. Excludes the question
// being answered right now — its response row is already saved by the time
// this runs, so it must not count itself as a prior write.
async function numericTraitWriteCount(userId: string, trait: PersonalityNumericTrait, excludeQuestionId: string): Promise<number> {
  const questionsForTrait = PERSONALITY_QUESTIONS.filter((q) =>
    q.measures === trait || q.options.some((o) => Object.keys(o.traits).includes(trait))
  );
  const rows = await db.select().from(quizResponses).where(eq(quizResponses.userId, userId));
  return rows.filter((r) => r.questionId !== excludeQuestionId && questionsForTrait.some((q) => q.id === r.questionId)).length;
}

quizRouter.post("/answer", requireAuth, async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid answer payload" });
  const user = (req as any).user;
  const { questionId, answer } = parsed.data;

  const [existingResponse] = await db
    .select()
    .from(quizResponses)
    .where(and(eq(quizResponses.userId, user.id), eq(quizResponses.questionId, questionId)))
    .limit(1);
  const isEdit = Boolean(existingResponse);

  await db
    .insert(quizResponses)
    .values({ userId: user.id, questionId, answer })
    .onConflictDoUpdate({
      target: [quizResponses.userId, quizResponses.questionId],
      set: { answer },
    });

  // ── interests_categories: initialize empty sub-interest buckets ──
  if (questionId === "interests_categories" && Array.isArray(answer)) {
    const [row] = await db.select().from(userTraits).where(eq(userTraits.userId, user.id)).limit(1);
    const existing = (row?.interests as Record<string, string[]>) ?? {};
    const interests: Record<string, string[]> = {};
    for (const cat of answer) interests[cat] = existing[cat] ?? [];
    await db.update(userTraits).set({ interests }).where(eq(userTraits.userId, user.id));
  }

  // ── sub_interest:<category> ──
  if (questionId.startsWith("sub_interest:") && Array.isArray(answer)) {
    const category = questionId.slice("sub_interest:".length);
    const [row] = await db.select().from(userTraits).where(eq(userTraits.userId, user.id)).limit(1);
    const interests = { ...((row?.interests as Record<string, string[]>) ?? {}) };
    interests[category] = answer as string[];

    const updates: Partial<typeof userTraits.$inferInsert> = { interests };

    if (category === "comedy") {
      const slugs = answer as string[];
      const hasHigh = slugs.some((s) => HUMOUR_EDGE_HIGH_SLUGS.includes(s));
      const hasLow = slugs.some((s) => HUMOUR_EDGE_LOW_SLUGS.includes(s));
      if (hasHigh) updates.humourEdge = "high";
      else if (hasLow) updates.humourEdge = "low";
    }

    await db.update(userTraits).set(updates).where(eq(userTraits.userId, user.id));
  }

  // ── personality questions ──
  const personalityQuestion = PERSONALITY_QUESTIONS.find((q) => q.id === questionId);
  if (personalityQuestion && typeof answer === "string") {
    const option = personalityQuestion.options.find((o) => o.value === answer);
    if (option) {
      const [row] = await db.select().from(userTraits).where(eq(userTraits.userId, user.id)).limit(1);
      if (row) {
        const updates: Partial<typeof userTraits.$inferInsert> = {};
        const clamp = (v: number) => Math.max(0, Math.min(100, v));

        for (const [trait, value] of Object.entries(option.traits)) {
          if (trait === "humourStyle") {
            updates.humourStyleCategory = value as string;
          } else if (trait === "airtimeStyle") {
            updates.airtimeStyle = value as string;
          } else {
            const numericTrait = trait as PersonalityNumericTrait;
            const column = NUMERIC_TRAIT_COLUMN[numericTrait];
            if (!column) continue;
            const current = (row as any)[column] as number;
            if (isEdit) {
              // Re-answering this exact question: replace, don't average with itself.
              (updates as any)[column] = clamp(value as number);
            } else {
              // A different question nudging the same trait: blend in.
              const writes = await numericTraitWriteCount(user.id, numericTrait, questionId);
              const weight = 1 / Math.max(1, writes + 1);
              (updates as any)[column] = clamp(Math.round(current * (1 - weight) + (value as number) * weight));
            }
          }
        }
        if (Object.keys(updates).length) {
          await db.update(userTraits).set(updates).where(eq(userTraits.userId, user.id));
        }
      }
    }
  }

  if (questionId === "intent_here_for") {
    await db.update(userTraits).set({ intent: answer }).where(eq(userTraits.userId, user.id));
  }
  if (questionId === "intent_comfort") {
    await db.update(userTraits).set({ groupComfort: answer }).where(eq(userTraits.userId, user.id));
  }

  res.json({ ok: true });
});

quizRouter.post("/complete", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [traits] = await db.select().from(userTraits).where(eq(userTraits.userId, user.id)).limit(1);
  if (!traits) return res.status(400).json({ error: "No quiz data" });

  const archetypeId = chooseArchetype({
    socialInitiation: traits.socialInitiation,
    conversationDepth: traits.conversationDepth,
    disagreementTolerance: traits.disagreementTolerance,
    spontaneity: traits.spontaneity,
    groupEnergyPref: traits.groupEnergyPref,
    humourStyle: traits.humourStyleCategory,
    airtimeStyle: traits.airtimeStyle,
  });
  const archetype = VIBE_ARCHETYPES.find((a) => a.id === archetypeId) ?? VIBE_ARCHETYPES[0];

  await db.update(userTraits).set({ archetypeId: archetype.id }).where(eq(userTraits.userId, user.id));
  await db.update(users).set({ onboardingStep: "avatar", updatedAt: new Date() }).where(eq(users.id, user.id));

  const interests = (traits.interests as Record<string, string[]>) ?? {};
  const topInterests: string[] = [];
  for (const [category, slugs] of Object.entries(interests)) {
    for (const slug of slugs) {
      const label = SUB_INTERESTS[category]?.options.find((o) => o.slug === slug)?.label;
      if (label) topInterests.push(label);
      if (topInterests.length >= 3) break;
    }
    if (topInterests.length >= 3) break;
  }

  res.json({
    ok: true,
    vibeCard: {
      archetype: archetype.name,
      description: archetype.description,
      topInterests,
      dialListenLead: traits.socialInitiation,
      dialBanterDepth: traits.conversationDepth,
    },
  });
});

quizRouter.get("/vibe", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [traits] = await db.select().from(userTraits).where(eq(userTraits.userId, user.id)).limit(1);
  if (!traits || !traits.archetypeId) return res.json({ vibe: null });

  const archetype = VIBE_ARCHETYPES.find((a) => a.id === traits.archetypeId);
  res.json({ vibe: archetype ? { archetype: archetype.name, description: archetype.description } : null });
});
