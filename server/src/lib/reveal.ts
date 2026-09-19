import { db } from "../db/client";
import { chatRooms, matchGroups } from "../db/schema";
import { eq } from "drizzle-orm";

export async function isRoomRevealed(roomId: string): Promise<boolean> {
  const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).limit(1);
  if (!room) return false;
  const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, room.groupId)).limit(1);
  if (!group) return false;
  return new Date() >= new Date(new Date(group.meetAt).getTime() - 2 * 3600 * 1000);
}
