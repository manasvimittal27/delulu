import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db/client";
import { chatRooms, matchGroupMembers, messages, users, messageReads, matchGroups, venues } from "./db/schema";
import { and, eq } from "drizzle-orm";
import { serializeUser } from "./lib/serialize";
import { isRoomRevealed } from "./lib/reveal";

interface ClientInfo {
  userId: string;
  roomId: string;
}

const rooms = new Map<string, Set<WebSocket>>();
const clientInfo = new WeakMap<WebSocket, ClientInfo>();

function broadcast(roomId: string, payload: unknown) {
  const set = rooms.get(roomId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

export function attachWebSocket(server: Server, sessionMiddleware: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "", "http://localhost");
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }
    sessionMiddleware(req, {}, () => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });
  });

  wss.on("connection", (ws, req: any) => {
    const userId: string | undefined = req.session?.userId;
    if (!userId) {
      ws.close(4001, "unauthorized");
      return;
    }

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "join") {
          const room = await assertMember(userId, msg.roomId);
          if (!room) return ws.send(JSON.stringify({ type: "error", error: "not a member" }));
          clientInfo.set(ws, { userId, roomId: msg.roomId });
          if (!rooms.has(msg.roomId)) rooms.set(msg.roomId, new Set());
          rooms.get(msg.roomId)!.add(ws);
          ws.send(JSON.stringify({ type: "joined", roomId: msg.roomId }));
        } else if (msg.type === "message") {
          const info = clientInfo.get(ws);
          if (!info) return;
          const [sender] = await db.select().from(users).where(eq(users.id, info.userId)).limit(1);
          if (!sender) return;

          const rawBody = String(msg.body).slice(0, 2000);
          if (containsPrivateContactAttempt(rawBody)) {
            ws.send(
              JSON.stringify({
                type: "blocked",
                reason: "Delulu meets happen at public venues. Stay safe.",
              })
            );
            return;
          }

          const [saved] = await db
            .insert(messages)
            .values({ roomId: info.roomId, senderId: info.userId, body: rawBody })
            .returning();
          const revealed = await isRoomRevealed(info.roomId);
          broadcast(info.roomId, {
            type: "message",
            message: {
              id: saved.id,
              body: saved.body,
              createdAt: saved.createdAt,
              isSystem: false,
              sender: serializeUser(sender, revealed),
            },
          });
        } else if (msg.type === "typing") {
          const info = clientInfo.get(ws);
          if (!info) return;
          broadcast(info.roomId, { type: "typing", userId: info.userId });
        } else if (msg.type === "reaction") {
          const info = clientInfo.get(ws);
          if (!info) return;
          const [message] = await db.select().from(messages).where(eq(messages.id, msg.messageId)).limit(1);
          if (!message || message.roomId !== info.roomId) return;

          const emoji = String(msg.emoji).slice(0, 8);
          const reactions = { ...((message.reactions as Record<string, string[]>) ?? {}) };
          const holders = new Set(reactions[emoji] ?? []);
          if (holders.has(info.userId)) {
            holders.delete(info.userId);
          } else {
            holders.add(info.userId);
          }
          if (holders.size) {
            reactions[emoji] = Array.from(holders);
          } else {
            delete reactions[emoji];
          }

          await db.update(messages).set({ reactions }).where(eq(messages.id, message.id));
          broadcast(info.roomId, { type: "reaction", messageId: message.id, reactions });
        } else if (msg.type === "read") {
          const info = clientInfo.get(ws);
          if (!info) return;
          await db
            .insert(messageReads)
            .values({ roomId: info.roomId, userId: info.userId, lastReadMessageId: msg.messageId })
            .onConflictDoUpdate({
              target: [messageReads.roomId, messageReads.userId],
              set: { lastReadMessageId: msg.messageId, updatedAt: new Date() },
            });
          broadcast(info.roomId, { type: "read", userId: info.userId, messageId: msg.messageId });
        } else if (msg.type === "poll_create") {
          const info = clientInfo.get(ws);
          if (!info) return;
          const [sender] = await db.select().from(users).where(eq(users.id, info.userId)).limit(1);
          if (!sender) return;

          const question = String(msg.question ?? "").slice(0, 200);
          const options = Array.isArray(msg.options) ? msg.options.slice(0, 6) : [];
          if (!question || options.length < 2) return;

          const poll = {
            question,
            options: options.map((label: string, i: number) => ({ id: String(i), label: String(label).slice(0, 80), votes: [] as string[] })),
          };

          const [saved] = await db
            .insert(messages)
            .values({ roomId: info.roomId, senderId: info.userId, body: `Poll: ${question}`, poll })
            .returning();

          const pollRevealed = await isRoomRevealed(info.roomId);
          broadcast(info.roomId, {
            type: "message",
            message: {
              id: saved.id,
              body: saved.body,
              createdAt: saved.createdAt,
              isSystem: false,
              sender: serializeUser(sender, pollRevealed),
              poll: saved.poll,
            },
          });
        } else if (msg.type === "poll_vote") {
          const info = clientInfo.get(ws);
          if (!info) return;
          const [message] = await db.select().from(messages).where(eq(messages.id, msg.messageId)).limit(1);
          if (!message || message.roomId !== info.roomId || !message.poll) return;

          const poll = message.poll as { question: string; options: { id: string; label: string; votes: string[] }[] };
          for (const opt of poll.options) {
            opt.votes = opt.votes.filter((v) => v !== info.userId);
          }
          const target = poll.options.find((o) => o.id === msg.optionId);
          if (target) target.votes.push(info.userId);

          await db.update(messages).set({ poll }).where(eq(messages.id, message.id));
          broadcast(info.roomId, { type: "poll_update", messageId: message.id, poll });
        } else if (msg.type === "share_venue") {
          const info = clientInfo.get(ws);
          if (!info) return;
          const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, info.roomId)).limit(1);
          if (!room) return;
          const [group] = await db.select().from(matchGroups).where(eq(matchGroups.id, room.groupId)).limit(1);
          if (!group?.venueId) return;
          const [venue] = await db.select().from(venues).where(eq(venues.id, group.venueId)).limit(1);
          if (!venue) return;

          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;
          const [saved] = await db
            .insert(messages)
            .values({
              roomId: info.roomId,
              isSystem: true,
              body: `📍 ${venue.name} — ${venue.address}\n${mapsUrl}`,
            })
            .returning();
          broadcast(info.roomId, {
            type: "message",
            message: { id: saved.id, body: saved.body, createdAt: saved.createdAt, isSystem: true, sender: null },
          });
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.on("close", () => {
      const info = clientInfo.get(ws);
      if (info) rooms.get(info.roomId)?.delete(ws);
    });
  });
}

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

export function broadcastToRoom(roomId: string, payload: unknown) {
  broadcast(roomId, payload);
}

const PHONE_RE = /(\+?91[\s-]?)?[6-9]\d{9}\b/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ADDRESS_RE = /\b\d{1,4}\s+[a-zA-Z0-9\s]{3,40}(street|st\.|road|rd\.|apartment|apt\.|flat|house no|block)\b/i;
const REDIRECT_RE = /\b(instagram|insta|snapchat|whatsapp|telegram|meet me at my|come to my (place|house|flat))\b/i;

function containsPrivateContactAttempt(text: string): boolean {
  return PHONE_RE.test(text) || EMAIL_RE.test(text) || ADDRESS_RE.test(text) || REDIRECT_RE.test(text);
}
