import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { circleConnections, chatRooms, users, matchGroupMembers } from "../db/schema";
import { eq, or, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serialize";

export const circleRouter = Router();

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

circleRouter.post("/add", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { userId: otherId, groupId } = z.object({ userId: z.string().uuid(), groupId: z.string().uuid() }).parse(req.body);

  const wasTogether = await db
    .select()
    .from(matchGroupMembers)
    .where(and(eq(matchGroupMembers.groupId, groupId), eq(matchGroupMembers.userId, otherId)))
    .limit(1);
  if (!wasTogether.length) return res.status(403).json({ error: "You didn't meet this person at that table" });

  const [a, b] = orderedPair(user.id, otherId);
  const isUserA = a === user.id;

  let [conn] = await db
    .select()
    .from(circleConnections)
    .where(and(eq(circleConnections.userAId, a), eq(circleConnections.userBId, b)))
    .limit(1);

  if (!conn) {
    [conn] = await db
      .insert(circleConnections)
      .values({ userAId: a, userBId: b, userAAdded: isUserA, userBAdded: !isUserA })
      .returning();
  } else {
    const update = isUserA ? { userAAdded: true } : { userBAdded: true };
    [conn] = await db.update(circleConnections).set(update).where(eq(circleConnections.id, conn.id)).returning();
  }

  if (conn.userAAdded && conn.userBAdded && !conn.mutualAt) {
    const [room] = await db.insert(chatRooms).values({ groupId, isCircle: true }).returning();
    [conn] = await db
      .update(circleConnections)
      .set({ mutualAt: new Date(), chatRoomId: room.id })
      .where(eq(circleConnections.id, conn.id))
      .returning();
  }

  res.json({ ok: true, mutual: Boolean(conn.mutualAt), chatRoomId: conn.chatRoomId });
});

circleRouter.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const rows = await db
    .select()
    .from(circleConnections)
    .where(and(or(eq(circleConnections.userAId, user.id), eq(circleConnections.userBId, user.id)), eq(circleConnections.userAAdded, true)));

  const mutual = rows.filter((r) => r.mutualAt);
  const otherIds = mutual.map((r) => (r.userAId === user.id ? r.userBId : r.userAId));
  const otherUsers = otherIds.length
    ? await db.select().from(users).where(or(...otherIds.map((id) => eq(users.id, id))))
    : [];

  res.json({
    circle: mutual.map((r) => {
      const otherId = r.userAId === user.id ? r.userBId : r.userAId;
      const other = otherUsers.find((u) => u.id === otherId);
      return {
        chatRoomId: r.chatRoomId,
        user: other ? serializeUser(other, true) : null,
      };
    }),
  });
});
