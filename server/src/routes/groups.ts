import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { matchGroups, matchGroupMembers, users, venues, bookings, meetupFeedback } from "../db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serialize";
import { applyNoShowStrike } from "../services/reliability";

export const groupsRouter = Router();

async function assertMember(userId: string, groupId: string) {
  const [m] = await db
    .select()
    .from(matchGroupMembers)
    .where(and(eq(matchGroupMembers.groupId, groupId), eq(matchGroupMembers.userId, userId)))
    .limit(1);
  return m;
}

groupsRouter.get("/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const membership = await assertMember(user.id, req.params.id);
  if (!membership) return res.status(403).json({ error: "Not a member of this table" });

  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Not found" });

  const [venue] = group.venueId ? await db.select().from(venues).where(eq(venues.id, group.venueId)).limit(1) : [];

  const memberRows = await db
    .select({ member: matchGroupMembers, u: users })
    .from(matchGroupMembers)
    .innerJoin(users, eq(matchGroupMembers.userId, users.id))
    .where(eq(matchGroupMembers.groupId, group.id));

  const revealAt = new Date(new Date(group.meetAt).getTime() - 2 * 3600 * 1000);
  const revealed = new Date() >= revealAt;

  res.json({
    group: {
      id: group.id,
      tableName: group.tableName,
      meetAt: group.meetAt,
      status: group.status,
      chatRoomId: group.chatRoomId,
      revealAt,
      revealed,
    },
    venue,
    members: memberRows.map((m) => ({
      ...serializeUser(m.u, revealed),
      arrivedAt: m.member.arrivedAt,
      isSelf: m.u.id === user.id,
    })),
  });
});

groupsRouter.post("/:id/arrive", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const membership = await assertMember(user.id, req.params.id);
  if (!membership) return res.status(403).json({ error: "Not a member" });

  await db
    .update(matchGroupMembers)
    .set({ arrivedAt: new Date() })
    .where(eq(matchGroupMembers.id, membership.id));

  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  res.json({ ok: true, chatRoomId: group?.chatRoomId });
});

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  noShowUserIds: z.array(z.string().uuid()).default([]),
  notes: z.string().optional(),
});

groupsRouter.post("/:id/feedback", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const membership = await assertMember(user.id, req.params.id);
  if (!membership) return res.status(403).json({ error: "Not a member" });

  const parsed = feedbackSchema.parse(req.body);
  await db.insert(meetupFeedback).values({
    groupId: req.params.id,
    userId: user.id,
    rating: parsed.rating,
    noShowUserIds: parsed.noShowUserIds,
    notes: parsed.notes,
  });

  for (const noShowId of parsed.noShowUserIds) {
    const allFeedback = await db.select().from(meetupFeedback).where(eq(meetupFeedback.groupId, req.params.id));
    const reportsOfThisUser = allFeedback.filter((f) =>
      (f.noShowUserIds as string[]).includes(noShowId)
    ).length;
    if (reportsOfThisUser >= 2) {
      await applyNoShowStrike(noShowId);
    }
  }

  res.json({ ok: true });
});

groupsRouter.post("/:id/cancel", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.matchGroupId, req.params.id), eq(bookings.userId, user.id)))
    .limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const hoursUntil = (new Date(group.meetAt).getTime() - Date.now()) / (3600 * 1000);
  const refund = hoursUntil >= 24;

  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, booking.id));

  if (refund) {
    await db
      .update(users)
      .set({ creditsPaise: user.creditsPaise + booking.amountPaise })
      .where(eq(users.id, user.id));
  }

  res.json({ ok: true, refunded: refund });
});
