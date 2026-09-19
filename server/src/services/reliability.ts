import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function applyNoShowStrike(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const strikes = user.strikes + 1;
  const trustScore = Math.max(0, user.trustScore - 15);

  const updates: Partial<typeof users.$inferInsert> = { strikes, trustScore };

  if (strikes >= 5) {
    updates.bannedAt = new Date();
  } else if (strikes >= 3) {
    updates.suspendedUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}
