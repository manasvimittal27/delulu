import cron from "node-cron";
import { db } from "../db/client";
import { meetSlots, events } from "../db/schema";
import { gte, eq } from "drizzle-orm";
import { runMatchingForSlot, runMatchingForEvent } from "../services/matching";

async function runAllPendingSlots() {
  const today = new Date().toISOString().slice(0, 10);
  const slots = await db.select().from(meetSlots).where(gte(meetSlots.date, today));
  for (const slot of slots) {
    try {
      const result = await runMatchingForSlot(slot.id, false);
      console.log(`[match-cron] slot ${slot.area} ${slot.date} ${slot.window}: ${result.groups.length} groups, ${result.unmatched.length} unmatched`);
    } catch (e) {
      console.error(`[match-cron] failed for slot ${slot.id}`, e);
    }
  }

  const upcomingEvents = await db.select().from(events).where(eq(events.status, "published"));
  for (const event of upcomingEvents) {
    if (event.date < today) continue;
    try {
      const result = await runMatchingForEvent(event.id, false);
      if (result.poolSize > 0) {
        console.log(`[match-cron] event ${event.title}: ${result.groups.length} groups, ${result.unmatched.length} unmatched`);
      }
    } catch (e) {
      console.error(`[match-cron] failed for event ${event.id}`, e);
    }
  }
}

export function startMatchCron() {
  // 20:00 IST daily -> matches tomorrow's slots
  cron.schedule("30 14 * * *", runAllPendingSlots, { timezone: "UTC" }); // 14:30 UTC = 20:00 IST
  // 10:00 IST same-day sweep
  cron.schedule("30 4 * * *", runAllPendingSlots, { timezone: "UTC" }); // 04:30 UTC = 10:00 IST
}
