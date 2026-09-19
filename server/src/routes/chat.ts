import { Router } from "express";
import { db } from "../db/client";
import { chatRooms, matchGroupMembers, messages, users } from "../db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serialize";
import { isRoomRevealed } from "../lib/reveal";

export const chatRouter = Router();

async function assertMember(userId: string, roomId: string) {
  const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).limit(1);
  if (!room) return null;
  const [membership] = await db
    .select()
    .from(matchGroupMembers)
    .where(and(eq(matchGroupMembers.groupId, room.groupId), eq(matchGroupMembers.userId, userId)))
    .limit(1);
  return membership ? room : null;
}

chatRouter.get("/:roomId/messages", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const room = await assertMember(user.id, req.params.roomId);
  if (!room) return res.status(403).json({ error: "Not a member of this table" });

  const revealed = await isRoomRevealed(room.id);

  const rows = await db
    .select({ message: messages, sender: users })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.roomId, room.id))
    .orderBy(asc(messages.createdAt))
    .limit(200);

  res.json({
    messages: rows.map((r) => ({
      id: r.message.id,
      body: r.message.body,
      isSystem: r.message.isSystem,
      createdAt: r.message.createdAt,
      replyToId: r.message.replyToId,
      reactions: r.message.reactions,
      poll: r.message.poll,
      sender: r.sender ? serializeUser(r.sender, revealed) : null,
    })),
  });
});
