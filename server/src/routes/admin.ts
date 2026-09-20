import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import {
  meetSlots,
  matchRuns,
  matchGroups,
  matchGroupMembers,
  users,
  pairScores,
  venues,
  hosts,
  events,
  payouts,
  bookings,
  reports,
  safetyCheckins,
  quizResponses,
  messages,
  auditLog,
  notifications,
  userTraits,
} from "../db/schema";
import { eq, desc, sql as dsql, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { runMatchingForSlot, runMatchingForEvent, computeComposition } from "../services/matching";
import { eventRevenue } from "../services/revenue";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.post("/match-run", async (req, res) => {
  const { slotId, dryRun } = z.object({ slotId: z.string().uuid(), dryRun: z.boolean().default(false) }).parse(req.body);
  const result = await runMatchingForSlot(slotId, dryRun);
  res.json({
    ok: true,
    poolSize: result.poolSize,
    groupsFormed: result.groups.length,
    unmatched: result.unmatched.length,
    groups: result.groups.map((g) => ({
      cohesion: g.cohesion,
      memberUserIds: g.members.map((m) => m.userId),
    })),
  });
});

adminRouter.post("/match-run-event", async (req, res) => {
  const { eventId, dryRun } = z.object({ eventId: z.string().uuid(), dryRun: z.boolean().default(false) }).parse(req.body);
  const result = await runMatchingForEvent(eventId, dryRun);
  res.json({
    ok: true,
    poolSize: result.poolSize,
    groupsFormed: result.groups.length,
    unmatched: result.unmatched.length,
    groups: result.groups.map((g) => ({
      cohesion: g.cohesion,
      memberUserIds: g.members.map((m) => m.userId),
    })),
  });
});

adminRouter.get("/match-runs", async (_req, res) => {
  const runs = await db.select().from(matchRuns).orderBy(desc(matchRuns.createdAt)).limit(50);
  res.json({ runs });
});

adminRouter.get("/slots", async (_req, res) => {
  const slots = await db.select().from(meetSlots).orderBy(desc(meetSlots.date)).limit(100);
  res.json({ slots });
});

adminRouter.get("/groups/:id", async (req, res) => {
  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Not found" });

  const members = await db
    .select({ member: matchGroupMembers, user: users, traits: userTraits })
    .from(matchGroupMembers)
    .innerJoin(users, eq(matchGroupMembers.userId, users.id))
    .leftJoin(userTraits, eq(userTraits.userId, users.id))
    .where(eq(matchGroupMembers.groupId, group.id));

  const scores = await db.select().from(pairScores).where(eq(pairScores.groupId, group.id));
  const [venue] = group.venueId ? await db.select().from(venues).where(eq(venues.id, group.venueId)).limit(1) : [];

  const composition = computeComposition(members.map((m) => ({ airtimeStyle: m.traits?.airtimeStyle ?? null })));

  res.json({
    group,
    venue,
    composition,
    members: members.map((m) => ({
      userId: m.user.id,
      username: m.user.username,
      airtimeStyle: m.traits?.airtimeStyle ?? null,
      archetypeId: m.traits?.archetypeId ?? null,
    })),
    pairScores: scores,
  });
});

adminRouter.post("/groups/:id/cancel", async (req, res) => {
  const admin = (req as any).user;
  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Not found" });
  if (group.status === "cancelled") return res.status(409).json({ error: "Already cancelled" });

  const members = await db.select().from(matchGroupMembers).where(eq(matchGroupMembers.groupId, group.id));

  await db.update(matchGroups).set({ status: "cancelled" }).where(eq(matchGroups.id, group.id));

  for (const m of members) {
    if (!m.bookingId) continue;
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, m.bookingId)).limit(1);
    if (!booking || booking.status === "refunded" || booking.status === "cancelled") continue;

    await db.update(bookings).set({ status: "refunded" }).where(eq(bookings.id, m.bookingId));
    await db
      .update(users)
      .set({ creditsPaise: dsql`${users.creditsPaise} + ${booking.amountPaise}` })
      .where(eq(users.id, m.userId));
    await db.insert(auditLog).values({
      actorId: admin.id,
      action: "admin.group_cancelled_refund",
      targetType: "booking",
      targetId: m.bookingId,
      metadata: { amountPaise: booking.amountPaise, groupId: group.id },
    });
    await db.insert(notifications).values({
      userId: m.userId,
      type: "group_cancelled",
      title: "Your table was cancelled",
      body: "We had to cancel this one. Your payment is back in your Delulu credits.",
    });
  }

  res.json({ ok: true, refundedMembers: members.length });
});

adminRouter.post("/groups/:id/members/:userId/remove", async (req, res) => {
  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Not found" });

  const [membership] = await db
    .select()
    .from(matchGroupMembers)
    .where(and(eq(matchGroupMembers.groupId, group.id), eq(matchGroupMembers.userId, req.params.userId)))
    .limit(1);
  if (!membership) return res.status(404).json({ error: "Not a member" });

  await db.delete(matchGroupMembers).where(eq(matchGroupMembers.id, membership.id));

  if (membership.bookingId) {
    await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, membership.bookingId));
  }
  if (group.chatRoomId) {
    await db.insert(messages).values({
      roomId: group.chatRoomId,
      isSystem: true,
      body: "A member has left this table.",
    });
  }

  res.json({ ok: true });
});

adminRouter.post("/groups/:id/members/add", async (req, res) => {
  const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Not found" });

  const [existing] = await db
    .select()
    .from(matchGroupMembers)
    .where(and(eq(matchGroupMembers.groupId, group.id), eq(matchGroupMembers.userId, userId)))
    .limit(1);
  if (existing) return res.status(409).json({ error: "Already a member" });

  await db.insert(matchGroupMembers).values({ groupId: group.id, userId });

  if (group.chatRoomId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    await db.insert(messages).values({
      roomId: group.chatRoomId,
      isSystem: true,
      body: `${user?.username ?? "A new member"} has joined this table.`,
    });
  }

  res.json({ ok: true });
});

adminRouter.get("/users", async (req, res) => {
  const search = String(req.query.q ?? "");
  const all = await db.select().from(users).limit(500);
  const filtered = search
    ? all.filter((u) => u.username?.includes(search) || u.phone.includes(search))
    : all;
  res.json({
    users: filtered.slice(0, 50).map((u) => ({
      id: u.id,
      username: u.username,
      phone: u.phone,
      city: u.city,
      strikes: u.strikes,
      trustScore: u.trustScore,
      suspendedUntil: u.suspendedUntil,
      bannedAt: u.bannedAt,
      role: u.role,
    })),
  });
});

adminRouter.post("/users/:id/suspend", async (req, res) => {
  const until = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await db.update(users).set({ suspendedUntil: until }).where(eq(users.id, req.params.id));
  res.json({ ok: true, suspendedUntil: until });
});

adminRouter.post("/users/:id/unsuspend", async (req, res) => {
  await db.update(users).set({ suspendedUntil: null }).where(eq(users.id, req.params.id));
  res.json({ ok: true });
});

adminRouter.post("/users/:id/reset-strikes", async (req, res) => {
  await db.update(users).set({ strikes: 0, trustScore: 100 }).where(eq(users.id, req.params.id));
  res.json({ ok: true });
});

adminRouter.get("/dashboard", async (_req, res) => {
  const [[{ signups }], [{ quizCompletions }], [{ groupsFormed }], [{ gmv }], [{ noShows }], [{ totalMembers }]] =
    await Promise.all([
      db.select({ signups: dsql<number>`count(*)::int` }).from(users),
      db.select({ quizCompletions: dsql<number>`count(distinct user_id)::int` }).from(quizResponses),
      db.select({ groupsFormed: dsql<number>`count(*)::int` }).from(matchGroups),
      db.select({ gmv: dsql<number>`coalesce(sum(amount_paise), 0)::int` }).from(bookings).where(dsql`${bookings.status} != 'cancelled'`),
      db.select({ noShows: dsql<number>`count(*)::int` }).from(users).where(dsql`${users.strikes} > 0`),
      db.select({ totalMembers: dsql<number>`count(*)::int` }).from(matchGroupMembers),
    ]);

  const avgCohesionRow = await db
    .select({ avg: dsql<number>`coalesce(avg(cohesion_score), 0)::int` })
    .from(matchGroups);

  res.json({
    signups,
    quizCompletions,
    groupsFormed,
    gmvPaise: gmv,
    usersWithStrikes: noShows,
    avgCohesion: avgCohesionRow[0]?.avg ?? 0,
    totalGroupMembers: totalMembers,
  });
});

adminRouter.get("/venues", async (_req, res) => {
  const rows = await db.select().from(venues);
  res.json({ venues: rows });
});

const venueSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  area: z.string().min(1),
  address: z.string().min(1),
  capacity: z.number().int().min(2).max(20).default(6),
  active: z.boolean().default(true),
});

adminRouter.post("/venues", async (req, res) => {
  const parsed = venueSchema.parse(req.body);
  const [venue] = await db.insert(venues).values(parsed).returning();
  res.json({ ok: true, venue });
});

adminRouter.patch("/venues/:id", async (req, res) => {
  const parsed = venueSchema.partial().parse(req.body);
  const [venue] = await db.update(venues).set(parsed).where(eq(venues.id, req.params.id)).returning();
  res.json({ ok: true, venue });
});

adminRouter.get("/hosts", async (_req, res) => {
  const rows = await db.select().from(hosts);
  res.json({ hosts: rows });
});

adminRouter.post("/hosts/:id/approve", async (req, res) => {
  const [host] = await db.update(hosts).set({ status: "verified" }).where(eq(hosts.id, req.params.id)).returning();
  res.json({ ok: true, host });
});

adminRouter.post("/hosts/:id/reject", async (req, res) => {
  const [host] = await db.update(hosts).set({ status: "rejected" }).where(eq(hosts.id, req.params.id)).returning();
  res.json({ ok: true, host });
});

adminRouter.patch("/hosts/:id/commission", async (req, res) => {
  const { commissionBps } = z.object({ commissionBps: z.number().int().min(0).max(10000) }).parse(req.body);
  const [host] = await db.update(hosts).set({ commissionBps }).where(eq(hosts.id, req.params.id)).returning();
  res.json({ ok: true, host });
});

adminRouter.get("/events", async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = status
    ? await db.select().from(events).where(eq(events.status, status as any))
    : await db.select().from(events);
  res.json({ events: rows });
});

adminRouter.post("/events/:id/approve", async (req, res) => {
  const [event] = await db.update(events).set({ status: "published" }).where(eq(events.id, req.params.id)).returning();
  res.json({ ok: true, event });
});

adminRouter.post("/events/:id/reject", async (req, res) => {
  const [event] = await db.update(events).set({ status: "cancelled" }).where(eq(events.id, req.params.id)).returning();
  res.json({ ok: true, event });
});

adminRouter.post("/events/:id/generate-payout", async (req, res) => {
  const [event] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.isDeluluHosted || !event.hostId) return res.status(400).json({ error: "No payout needed for Delulu-hosted events" });

  const [host] = await db.select().from(hosts).where(eq(hosts.id, event.hostId)).limit(1);
  if (!host) return res.status(404).json({ error: "Host not found" });

  const [{ count }] = await db
    .select({ count: dsql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.eventId, event.id), eq(bookings.status, "completed")));

  const grossPaise = event.pricePaise * count;
  const { platformRevenuePaise, hostPayablePaise } = eventRevenue(grossPaise, false, host.commissionBps);

  const [payout] = await db
    .insert(payouts)
    .values({
      hostId: host.id,
      eventId: event.id,
      grossPaise,
      commissionPaise: platformRevenuePaise,
      hostPayablePaise,
      status: "pending",
    })
    .returning();

  res.json({ ok: true, payout });
});

adminRouter.get("/payouts", async (_req, res) => {
  const rows = await db.select().from(payouts);
  res.json({ payouts: rows });
});

adminRouter.post("/payouts/:id/status", async (req, res) => {
  const { status, upiRef } = z
    .object({ status: z.enum(["pending", "processing", "paid"]), upiRef: z.string().optional() })
    .parse(req.body);
  const [payout] = await db.update(payouts).set({ status, upiRef }).where(eq(payouts.id, req.params.id)).returning();
  res.json({ ok: true, payout });
});

adminRouter.get("/reports", async (_req, res) => {
  const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
  res.json({ reports: rows });
});

adminRouter.post("/reports/:id/resolve", async (req, res) => {
  await db.update(reports).set({ resolved: true }).where(eq(reports.id, req.params.id));
  res.json({ ok: true });
});

adminRouter.get("/safety-checkins", async (_req, res) => {
  const rows = await db
    .select()
    .from(safetyCheckins)
    .where(eq(safetyCheckins.status, "need_help"))
    .orderBy(desc(safetyCheckins.createdAt));
  res.json({ checkins: rows });
});
