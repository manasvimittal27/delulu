import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { hosts, events, bookings, payouts, users } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const hostPortalRouter = Router();

const applySchema = z.object({
  name: z.string().min(1),
  organization: z.string().optional(),
  instagram: z.string().optional(),
  concept: z.string().min(1),
  previousEvents: z.string().optional(),
  upiId: z.string().min(1),
});

hostPortalRouter.post("/apply", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const parsed = applySchema.parse(req.body);

  const [existing] = await db.select().from(hosts).where(eq(hosts.userId, user.id)).limit(1);
  if (existing) return res.status(409).json({ error: "You already have a host application" });

  const [host] = await db.insert(hosts).values({ userId: user.id, ...parsed }).returning();
  res.json({ ok: true, host });
});

hostPortalRouter.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [host] = await db.select().from(hosts).where(eq(hosts.userId, user.id)).limit(1);
  if (!host) return res.json({ host: null });
  res.json({ host });
});

async function requireApprovedHost(req: any, res: any, next: any) {
  const user = req.user;
  const [host] = await db.select().from(hosts).where(and(eq(hosts.userId, user.id), eq(hosts.status, "verified"))).limit(1);
  if (!host) return res.status(403).json({ error: "Not an approved host" });
  req.hostRecord = host;
  next();
}

hostPortalRouter.use("/events", requireAuth, requireApprovedHost);

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  city: z.string().min(1),
  area: z.string().min(1),
  venueId: z.string().uuid().optional(),
  date: z.string(),
  time: z.string(),
  pricePaise: z.number().int().min(0),
  capacity: z.number().int().min(2).max(50),
  vibeTags: z.array(z.string()).default([]),
  interestTags: z.array(z.string()).default([]),
  coverImageUrl: z.string().optional(),
});

hostPortalRouter.get("/events", async (req, res) => {
  const host = (req as any).hostRecord;
  const rows = await db.select().from(events).where(eq(events.hostId, host.id));
  res.json({ events: rows });
});

hostPortalRouter.post("/events", async (req, res) => {
  const host = (req as any).hostRecord;
  const parsed = eventSchema.parse(req.body);
  const [event] = await db
    .insert(events)
    .values({ ...parsed, hostId: host.id, status: "pending_approval" })
    .returning();
  res.json({ ok: true, event });
});

hostPortalRouter.patch("/events/:id", async (req, res) => {
  const host = (req as any).hostRecord;
  const [existing] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!existing || existing.hostId !== host.id) return res.status(404).json({ error: "Not found" });

  const parsed = eventSchema.partial().parse(req.body);
  const [updated] = await db
    .update(events)
    .set({ ...parsed, status: "pending_approval" })
    .where(eq(events.id, req.params.id))
    .returning();
  res.json({ ok: true, event: updated });
});

hostPortalRouter.get("/events/:id/attendees", async (req, res) => {
  const host = (req as any).hostRecord;
  const [event] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
  if (!event || event.hostId !== host.id) return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select({ booking: bookings, user: users })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(and(eq(bookings.eventId, event.id), inArray(bookings.status, ["in_pool", "matched", "completed"])));

  res.json({
    attendees: rows.map((r) => ({ username: r.user.username, status: r.booking.status })),
  });
});

hostPortalRouter.get("/earnings", requireAuth, requireApprovedHost, async (req, res) => {
  const host = (req as any).hostRecord;
  const rows = await db.select().from(payouts).where(eq(payouts.hostId, host.id));
  const totalPaise = rows.reduce((s, p) => s + p.hostPayablePaise, 0);
  res.json({ payouts: rows, totalPaise });
});
