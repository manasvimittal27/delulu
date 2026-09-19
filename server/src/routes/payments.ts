import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { bookings, users, auditLog } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { createOrder, verifyPayment, mockPaymentDelay, mockSignature } from "../services/payments";

export const paymentsRouter = Router();

paymentsRouter.post("/order", requireAuth, async (req, res) => {
  const { bookingId } = z.object({ bookingId: z.string().uuid() }).parse(req.body);
  const user = (req as any).user;

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.userId !== user.id) return res.status(404).json({ error: "Booking not found" });

  const order = await createOrder(booking.amountPaise);
  await db.update(bookings).set({ paymentOrderId: order.orderId }).where(eq(bookings.id, bookingId));

  res.json(order);
});

paymentsRouter.post("/verify", requireAuth, async (req, res) => {
  const schema = z.object({
    bookingId: z.string().uuid(),
    orderId: z.string(),
    paymentId: z.string(),
    signature: z.string(),
  });
  const { bookingId, orderId, paymentId, signature } = schema.parse(req.body);
  const user = (req as any).user;

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.userId !== user.id) return res.status(404).json({ error: "Booking not found" });
  if (booking.paymentOrderId !== orderId) return res.status(400).json({ error: "Order mismatch" });

  const valid = await verifyPayment(orderId, paymentId, signature);
  if (!valid) return res.status(400).json({ error: "Payment signature verification failed" });

  const [updated] = await db
    .update(bookings)
    .set({ status: "in_pool", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();

  await db.insert(auditLog).values({
    actorId: user.id,
    action: "payment.verified",
    targetType: "booking",
    targetId: bookingId,
    metadata: { orderId, paymentId, amountPaise: booking.amountPaise },
  });

  res.json({ ok: true, booking: updated });
});

paymentsRouter.post("/mock/pay", requireAuth, async (req, res) => {
  const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
  await mockPaymentDelay();
  const paymentId = `mock_pay_${Math.random().toString(36).slice(2)}`;
  const signature = mockSignature(orderId, paymentId);
  res.json({ paymentId, signature });
});
