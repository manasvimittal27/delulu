import { Router } from "express";
import { db } from "../db/client";
import { notifications } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  res.json({ notifications: rows });
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res) => {
  const user = (req as any).user;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, user.id)));
  res.json({ ok: true });
});
