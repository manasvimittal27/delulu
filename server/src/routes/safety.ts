import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { safetyCheckins, notifications, users, emergencyContacts } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const safetyRouter = Router();

const checkinSchema = z.object({
  groupId: z.string().uuid(),
  status: z.enum(["safe", "need_help"]),
});

safetyRouter.post("/checkin", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { groupId, status } = checkinSchema.parse(req.body);

  await db.insert(safetyCheckins).values({ groupId, userId: user.id, status });

  if (status === "need_help") {
    const admins = await db.select().from(users).where(eq(users.role, "admin"));
    for (const admin of admins) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: "safety_alert",
        title: "Need-help alert",
        body: `${user.username ?? "A user"} flagged need-help for group ${groupId}.`,
      });
    }
  }

  res.json({ ok: true, emergencyNumber: "112" });
});

safetyRouter.get("/emergency-contacts", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const contacts = await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, user.id));
  res.json({ contacts });
});

safetyRouter.post("/emergency-contacts", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { name, phone } = z.object({ name: z.string().min(1), phone: z.string().regex(/^[6-9]\d{9}$/) }).parse(req.body);
  const [contact] = await db.insert(emergencyContacts).values({ userId: user.id, name, phone }).returning();
  res.json({ ok: true, contact });
});
