import cron from "node-cron";
import { db } from "../db/client";
import { matchGroups, matchGroupMembers, messages, icebreakerPrompts, notifications } from "../db/schema";
import { eq, and, gte } from "drizzle-orm";

async function pickIcebreaker(): Promise<string> {
  const prompts = await db.select().from(icebreakerPrompts).where(eq(icebreakerPrompts.active, true));
  if (!prompts.length) return "Tell the table something true and slightly unhinged.";
  return prompts[Math.floor(Math.random() * prompts.length)].prompt;
}

async function tick() {
  const now = new Date();
  const groups = await db
    .select()
    .from(matchGroups)
    .where(and(eq(matchGroups.status, "confirmed"), gte(matchGroups.meetAt, now)));

  for (const group of groups) {
    const meetAt = new Date(group.meetAt);
    const hoursUntil = (meetAt.getTime() - now.getTime()) / (3600 * 1000);
    const sent: string[] = (group.remindersSent as string[]) ?? [];
    const members = await db.select().from(matchGroupMembers).where(eq(matchGroupMembers.groupId, group.id));

    async function sendOnce(tag: string, title: string, body: string) {
      if (sent.includes(tag)) return;
      for (const m of members) {
        await db.insert(notifications).values({ userId: m.userId, type: tag, title, body });
      }
      sent.push(tag);
    }

    if (hoursUntil <= 24) await sendOnce("t_24h", "Tomorrow's the day", `${group.tableName} meets in about 24 hours.`);
    if (hoursUntil <= 2 && !group.revealedAt) {
      await db.update(matchGroups).set({ revealedAt: now }).where(eq(matchGroups.id, group.id));
      if (group.chatRoomId) {
        const names = "your table"; // first names come from serializeUser at read-time
        await db.insert(messages).values({
          roomId: group.chatRoomId,
          isSystem: true,
          body: `Names unlocked. Say hello to ${names} properly — you're meeting soon.`,
        });
      }
      await sendOnce("t_2h_reveal", "Names unlocked", "Check the chat — you can see first names now.");
    }
    if (hoursUntil <= 0.5) await sendOnce("t_30m", "Almost time", `${group.tableName} starts in 30 minutes. Here's the venue.`);

    if (group.chatRoomId) {
      const lastIce = group.lastIcebreakerAt ? new Date(group.lastIcebreakerAt).getTime() : 0;
      if (now.getTime() - lastIce >= 12 * 3600 * 1000) {
        const prompt = await pickIcebreaker();
        await db.insert(messages).values({ roomId: group.chatRoomId, isSystem: true, body: `Icebreaker: ${prompt}` });
        await db.update(matchGroups).set({ lastIcebreakerAt: now }).where(eq(matchGroups.id, group.id));
      }
    }

    await db.update(matchGroups).set({ remindersSent: sent }).where(eq(matchGroups.id, group.id));
  }
}

export function startReminderCron() {
  cron.schedule("*/5 * * * *", tick, { timezone: "UTC" });
}

export const __testTick = tick;
