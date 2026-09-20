import { Router } from "express";
import { db } from "../db/client";
import { bookings, meetSlots, matchGroups, matchGroupMembers, venues } from "../db/schema";
import { and, eq, gte, sql as dsql } from "drizzle-orm";
import { requireAuth, requireOnboarded } from "../middleware/auth";
import { bookCafeSlotSchema } from "@delulu/shared";

export const plansRouter = Router();

const CAFE_PRICE_PAISE = 4900;

plansRouter.get("/calendar", requireAuth, requireOnboarded("done"), async (req, res) => {
  const user = (req as any).user;
  const city = user.city ?? "Delhi NCR";
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 45);

  const slots = await db
    .select()
    .from(meetSlots)
    .where(and(eq(meetSlots.city, city), gte(meetSlots.date, today.toISOString().slice(0, 10))));

  const myGroups = await db
    .select({ group: matchGroups })
    .from(matchGroupMembers)
    .innerJoin(matchGroups, eq(matchGroupMembers.groupId, matchGroups.id))
    .where(eq(matchGroupMembers.userId, user.id));

  res.json({
    slots: slots.map((s) => ({ id: s.id, date: s.date, window: s.window, area: s.area, track: s.track })),
    myPlanDates: myGroups.map((g) => g.group.meetAt),
  });
});

plansRouter.get("/upcoming", requireAuth, requireOnboarded("done"), async (req, res) => {
  const user = (req as any).user;
  const rows = await db
    .select({ group: matchGroups, venue: venues })
    .from(matchGroupMembers)
    .innerJoin(matchGroups, eq(matchGroupMembers.groupId, matchGroups.id))
    .leftJoin(venues, eq(matchGroups.venueId, venues.id))
    .where(and(eq(matchGroupMembers.userId, user.id), gte(matchGroups.meetAt, new Date())));

  res.json({
    plans: rows.map((r) => ({
      groupId: r.group.id,
      tableName: r.group.tableName,
      meetAt: r.group.meetAt,
      venueName: r.venue?.name,
      venueArea: r.venue?.area,
      status: r.group.status,
      chatRoomId: r.group.chatRoomId,
    })),
  });
});

plansRouter.get("/pool-count", requireAuth, async (req, res) => {
  const { date, window, area } = req.query as Record<string, string>;
  if (!date || !window || !area) return res.status(400).json({ error: "Missing params" });

  const [slot] = await db
    .select()
    .from(meetSlots)
    .where(and(eq(meetSlots.date, date), eq(meetSlots.window, window as any), eq(meetSlots.area, area)))
    .limit(1);

  if (!slot) return res.json({ count: 0 });

  const [{ count }] = await db
    .select({ count: dsql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.slotId, slot.id), eq(bookings.status, "in_pool")));

  res.json({ count });
});

plansRouter.post("/cafe/book", requireAuth, requireOnboarded("done"), async (req, res) => {
  const parsed = bookCafeSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid booking" });
  }
  const { date, window, area, groupSizePrefRaw } = { ...parsed.data, groupSizePrefRaw: parsed.data.groupSize };
  const user = (req as any).user;

  let [slot] = await db
    .select()
    .from(meetSlots)
    .where(and(eq(meetSlots.date, date), eq(meetSlots.window, window), eq(meetSlots.area, area)))
    .limit(1);

  if (!slot) {
    [slot] = await db
      .insert(meetSlots)
      .values({ date, window, area, city: user.city ?? "Delhi NCR", track: "cafe" })
      .returning();
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      userId: user.id,
      track: "cafe",
      slotId: slot.id,
      groupSizePref: String(groupSizePrefRaw),
      intent: parsed.data.intent,
      groupComfort: parsed.data.groupComfort,
      status: "pending_payment",
      amountPaise: CAFE_PRICE_PAISE,
    })
    .returning();

  res.json({ ok: true, booking, amountPaise: CAFE_PRICE_PAISE, slotId: slot.id });
});
