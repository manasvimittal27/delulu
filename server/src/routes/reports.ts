import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { reports, blockedPairs } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rateLimit";

export const reportsRouter = Router();

const reportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  category: z.enum(["harassment", "no_show", "fake_profile", "safety_concern", "spam", "other"]),
  details: z.string().max(2000).optional(),
});

reportsRouter.post("/", requireAuth, rateLimitMiddleware("report", 10, 60 * 60 * 1000), async (req, res) => {
  const user = (req as any).user;
  const parsed = reportSchema.parse(req.body);
  const [report] = await db
    .insert(reports)
    .values({ reporterId: user.id, ...parsed })
    .returning();
  res.json({ ok: true, report });
});

export const blocksRouter = Router();

blocksRouter.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { blockedUserId, reason } = z.object({ blockedUserId: z.string().uuid(), reason: z.string().optional() }).parse(req.body);
  await db.insert(blockedPairs).values({ userId: user.id, blockedUserId, reason }).onConflictDoNothing();
  res.json({ ok: true });
});
