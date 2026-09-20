import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { events, venues, hosts, bookings } from "../db/schema";
import { eq, and, gte, sql as dsql } from "drizzle-orm";
import { requireAuth, requireOnboarded } from "../middleware/auth";

export const eventsRouter = Router();

eventsRouter.get("/", requireAuth, async (req, res) => {
  const { city } = req.query as Record<string, string>;
  const conditions = [eq(events.status, "published"), gte(events.date, new Date().toISOString().slice(0, 10))];
  if (city) conditions.push(eq(events.city, city));

  const rows = await db
    .select({ event: events, venue: venues })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(and(...conditions));

  res.json({
    events: rows.map((r) => ({
      id: r.event.id,
      title: r.event.title,
      category: r.event.category,
      date: r.event.date,
      time: r.event.time,
      area: r.event.area,
      city: r.event.city,
      pricePaise: r.event.pricePaise,
      capacity: r.event.capacity,
      vibeTags: r.event.vibeTags,
      isDeluluHosted: r.event.isDeluluHosted,
      venueName: r.venue?.name,
      coverImageUrl: r.event.coverImageUrl,
    })),
  });
});

eventsRouter.get("/:id", requireAuth, async (req, res) => {
  const [row] = await db
    .select({ event: events, venue: venues, host: hosts })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(hosts, eq(events.hostId, hosts.id))
    .where(eq(events.id, req.params.id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Event not found" });

  const [{ count }] = await db
    .select({ count: dsql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.eventId, row.event.id), dsql`${bookings.status} in ('in_pool','matched','completed')`));

  res.json({
    event: {
      id: row.event.id,
      title: row.event.title,
      description: row.event.description,
      category: row.event.category,
      date: row.event.date,
      time: row.event.time,
      pricePaise: row.event.pricePaise,
      capacity: row.event.capacity,
      seatsLeft: Math.max(0, row.event.capacity - count),
      attendeesGoing: count,
      vibeTags: row.event.vibeTags,
      venueName: row.venue?.name,
      venueArea: row.venue?.area,
      hostName: row.host?.name,
      isDeluluHosted: row.event.isDeluluHosted,
      coverImageUrl: row.event.coverImageUrl,
    },
  });
});

const FITNESS_LEVEL_CATEGORIES = ["fitness", "trek", "sports", "football"];

const bookEventSchema = z.object({
  mode: z.enum(["solo", "matched"]),
  fitnessLevel: z.enum(["just_starting", "casual", "regular", "very_serious"]).optional(),
});

eventsRouter.post("/:id/book", requireAuth, requireOnboarded("done"), async (req, res) => {
  const parsed = bookEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid booking" });
  const user = (req as any).user;

  const [event] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!event || event.status !== "published") return res.status(404).json({ error: "Event not found" });

  const [{ count }] = await db
    .select({ count: dsql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.eventId, event.id), dsql`${bookings.status} in ('in_pool','matched','completed')`));
  if (count >= event.capacity) return res.status(409).json({ error: "This event is full" });

  const [booking] = await db
    .insert(bookings)
    .values({
      userId: user.id,
      track: "event",
      eventId: event.id,
      intent: "vibes",
      groupComfort: "no_preference",
      groupSizePref: parsed.data.mode,
      fitnessLevel: FITNESS_LEVEL_CATEGORIES.includes(event.category) ? parsed.data.fitnessLevel : undefined,
      status: "pending_payment",
      amountPaise: event.pricePaise,
    })
    .returning();

  res.json({ ok: true, booking, amountPaise: event.pricePaise });
});
