import { db } from "../db/client";
import {
  bookings,
  users,
  userTraits,
  blockedPairs,
  pastGroupings,
  matchGroups,
  matchGroupMembers,
  pairScores,
  venues,
  chatRooms,
  messages,
  notifications,
  matchRuns,
  meetSlots,
  events,
  auditLog,
} from "../db/schema";
import { eq, and, inArray, gte, sql } from "drizzle-orm";
import { pairScore, pairScoreEvent, groupCohesion, type TraitInput } from "./scoring";
import { TIME_WINDOW_DEFAULTS, type TimeWindow } from "@delulu/shared";

const MIN_COHESION = 45;
const CAFE_MIN = 4;
const CAFE_MAX = 6;
const EVENT_MIN = 6;
const EVENT_MAX = 10;
const OPT_ITERATIONS = 200;

type ScoreFn = typeof pairScore;

interface Candidate {
  userId: string;
  bookingId: string;
  traits: TraitInput;
  intent: string;
  groupComfort: string;
  gender: string | null;
  dob: string | null;
  preferredGenders: string[];
  ageRangeMin: number | null;
  ageRangeMax: number | null;
}

interface PairKey {
  key: string;
  score: number;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

async function loadCandidates(slotId: string): Promise<Candidate[]> {
  const rows = await db
    .select({ booking: bookings, user: users, traits: userTraits })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(userTraits, eq(userTraits.userId, users.id))
    .where(and(eq(bookings.slotId, slotId), eq(bookings.status, "in_pool")));

  return rows.map((r) => ({
    userId: r.user.id,
    bookingId: r.booking.id,
    intent: r.booking.intent,
    groupComfort: r.booking.groupComfort,
    gender: r.user.gender,
    dob: r.user.dob,
    preferredGenders: (r.traits.preferredGenders as string[]) ?? [],
    ageRangeMin: r.traits.ageRangeMin,
    ageRangeMax: r.traits.ageRangeMax,
    traits: {
      socialEnergy: r.traits.socialEnergy,
      opennessToNew: r.traits.opennessToNew,
      humorStyle: r.traits.humorStyle,
      conversationDepth: r.traits.conversationDepth,
      planningStyle: r.traits.planningStyle,
      valuesScore: r.traits.valuesScore,
      lifestyleScore: r.traits.lifestyleScore,
      interests: (r.traits.interests as Record<string, string[]>) ?? {},
      dob: r.user.dob,
    },
  }));
}

async function loadEventCandidates(eventId: string): Promise<Candidate[]> {
  const rows = await db
    .select({ booking: bookings, user: users, traits: userTraits })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(userTraits, eq(userTraits.userId, users.id))
    .where(and(eq(bookings.eventId, eventId), eq(bookings.status, "in_pool"), eq(bookings.groupSizePref, "matched")));

  return rows.map((r) => ({
    userId: r.user.id,
    bookingId: r.booking.id,
    intent: r.booking.intent,
    groupComfort: r.booking.groupComfort,
    gender: r.user.gender,
    dob: r.user.dob,
    preferredGenders: (r.traits.preferredGenders as string[]) ?? [],
    ageRangeMin: r.traits.ageRangeMin,
    ageRangeMax: r.traits.ageRangeMax,
    traits: {
      socialEnergy: r.traits.socialEnergy,
      opennessToNew: r.traits.opennessToNew,
      humorStyle: r.traits.humorStyle,
      conversationDepth: r.traits.conversationDepth,
      planningStyle: r.traits.planningStyle,
      valuesScore: r.traits.valuesScore,
      lifestyleScore: r.traits.lifestyleScore,
      interests: (r.traits.interests as Record<string, string[]>) ?? {},
      dob: r.user.dob,
    },
  }));
}

async function loadHardConstraints(userIds: string[]) {
  const blocks = await db
    .select()
    .from(blockedPairs)
    .where(inArray(blockedPairs.userId, userIds));
  const blockedSet = new Set(blocks.map((b) => pairKey(b.userId, b.blockedUserId)));

  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const past = await db
    .select()
    .from(pastGroupings)
    .where(and(inArray(pastGroupings.userAId, userIds), gte(pastGroupings.metAt, cutoff)));
  const recentSet = new Set(past.map((p) => pairKey(p.userAId, p.userBId)));

  return { blockedSet, recentSet };
}

function intentCompatible(a: Candidate, b: Candidate): boolean {
  const friendshipOnly = (c: Candidate) => c.intent === "friendship";
  const romanticOnly = (c: Candidate) => c.intent === "romantic";
  if (friendshipOnly(a) && romanticOnly(b)) return false;
  if (friendshipOnly(b) && romanticOnly(a)) return false;
  return true;
}

function comfortCompatible(a: Candidate, b: Candidate): boolean {
  if (a.groupComfort === "same_gender" && a.gender && b.gender && a.gender !== b.gender) return false;
  if (b.groupComfort === "same_gender" && a.gender && b.gender && a.gender !== b.gender) return false;
  return true;
}

function ageOfCandidate(c: Candidate): number {
  if (!c.dob) return 24;
  return Math.floor((Date.now() - new Date(c.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

/** Only constrains pairs where BOTH sides are open to romance — a friendship-only pairing is never blocked by this. */
function romanticPrefsCompatible(a: Candidate, b: Candidate): boolean {
  const isRomanticSeeking = (c: Candidate) => c.intent === "romantic" || c.intent === "both";
  if (!isRomanticSeeking(a) || !isRomanticSeeking(b)) return true;

  const genderOk = (viewer: Candidate, other: Candidate) => {
    if (!viewer.preferredGenders.length) return true;
    if (viewer.preferredGenders.includes("prefer_not_to_say")) return true;
    if (!other.gender) return true;
    return viewer.preferredGenders.includes(other.gender);
  };
  const ageOk = (viewer: Candidate, other: Candidate) => {
    const otherAge = ageOfCandidate(other);
    if (viewer.ageRangeMin != null && otherAge < viewer.ageRangeMin) return false;
    if (viewer.ageRangeMax != null && otherAge > viewer.ageRangeMax) return false;
    return true;
  };

  return genderOk(a, b) && genderOk(b, a) && ageOk(a, b) && ageOk(b, a);
}

function canPair(
  a: Candidate,
  b: Candidate,
  blockedSet: Set<string>,
  recentSet: Set<string>
): boolean {
  const k = pairKey(a.userId, b.userId);
  if (blockedSet.has(k) || recentSet.has(k)) return false;
  if (!intentCompatible(a, b)) return false;
  if (!comfortCompatible(a, b)) return false;
  if (!romanticPrefsCompatible(a, b)) return false;
  return true;
}

function computeScoreCache(candidates: Candidate[], scoreFn: ScoreFn): Map<string, ReturnType<ScoreFn>> {
  const cache = new Map<string, ReturnType<ScoreFn>>();
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      cache.set(pairKey(a.userId, b.userId), scoreFn(a.traits, b.traits));
    }
  }
  return cache;
}

function groupScore(members: Candidate[], cache: Map<string, ReturnType<ScoreFn>>): number {
  const overalls: number[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const s = cache.get(pairKey(members[i].userId, members[j].userId));
      if (s) overalls.push(s.overall);
    }
  }
  return groupCohesion(overalls);
}

function allPairsValid(members: Candidate[], blockedSet: Set<string>, recentSet: Set<string>): boolean {
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if (!canPair(members[i], members[j], blockedSet, recentSet)) return false;
    }
  }
  return true;
}

function genderDiversityOk(members: Candidate[]): boolean {
  const hasMixedIntent = members.some((m) => m.intent === "romantic" || m.intent === "both");
  if (!hasMixedIntent) return true;
  const counts: Record<string, number> = {};
  for (const m of members) {
    const g = m.gender ?? "unknown";
    counts[g] = (counts[g] ?? 0) + 1;
  }
  const max = Math.max(...Object.values(counts));
  return max / members.length <= 0.7;
}

export interface FormedGroup {
  members: Candidate[];
  cohesion: number;
}

export function formGroups(
  candidates: Candidate[],
  blockedSet: Set<string>,
  recentSet: Set<string>,
  opts: { min: number; max: number; scoreFn: ScoreFn } = { min: CAFE_MIN, max: CAFE_MAX, scoreFn: pairScore }
): { groups: FormedGroup[]; unmatched: Candidate[] } {
  const { min, max, scoreFn } = opts;
  const cache = computeScoreCache(candidates, scoreFn);
  const remaining = [...candidates];
  const groups: Candidate[][] = [];

  // greedy seed: most constrained users first (fewest valid partners)
  const validPartnerCount = new Map<string, number>();
  for (const c of remaining) {
    let count = 0;
    for (const other of remaining) {
      if (other.userId !== c.userId && canPair(c, other, blockedSet, recentSet)) count++;
    }
    validPartnerCount.set(c.userId, count);
  }
  remaining.sort((a, b) => (validPartnerCount.get(a.userId)! - validPartnerCount.get(b.userId)!));

  while (remaining.length >= min) {
    const seed = remaining.shift()!;
    const group: Candidate[] = [seed];

    while (group.length < max && remaining.length) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const testGroup = [...group, candidate];
        if (!allPairsValid(testGroup, blockedSet, recentSet)) continue;
        if (group.length + 1 >= min && !genderDiversityOk(testGroup)) continue;
        const score = groupScore(testGroup, cache);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      group.push(remaining.splice(bestIdx, 1)[0]);
    }

    if (group.length >= min) {
      groups.push(group);
    } else {
      remaining.push(...group);
      break;
    }
  }

  // local search: swap members across groups if it improves total cohesion
  for (let iter = 0; iter < OPT_ITERATIONS; iter++) {
    if (groups.length < 2) break;
    const gi = Math.floor(Math.random() * groups.length);
    let gj = Math.floor(Math.random() * groups.length);
    if (gi === gj) continue;
    const groupA = groups[gi];
    const groupB = groups[gj];
    const mi = Math.floor(Math.random() * groupA.length);
    const mj = Math.floor(Math.random() * groupB.length);

    const beforeScore = groupScore(groupA, cache) + groupScore(groupB, cache);
    const newA = [...groupA];
    const newB = [...groupB];
    [newA[mi], newB[mj]] = [newB[mj], newA[mi]];

    if (!allPairsValid(newA, blockedSet, recentSet) || !allPairsValid(newB, blockedSet, recentSet)) continue;
    if (!genderDiversityOk(newA) || !genderDiversityOk(newB)) continue;

    const afterScore = groupScore(newA, cache) + groupScore(newB, cache);
    if (afterScore > beforeScore) {
      groups[gi] = newA;
      groups[gj] = newB;
    }
  }

  const formed = groups
    .map((g) => ({ members: g, cohesion: groupScore(g, cache) }))
    .filter((g) => g.cohesion >= MIN_COHESION);

  const matchedIds = new Set(formed.flatMap((g) => g.members.map((m) => m.userId)));
  const unmatched = candidates.filter((c) => !matchedIds.has(c.userId));

  return { groups: formed, unmatched };
}

export async function runMatchingForSlot(slotId: string, isDryRun: boolean) {
  const [slot] = await db.select().from(meetSlots).where(eq(meetSlots.id, slotId)).limit(1);
  if (!slot) throw new Error("Slot not found");

  const candidates = await loadCandidates(slotId);
  if (!candidates.length) {
    await db.insert(matchRuns).values({
      track: "cafe",
      slotId,
      isDryRun,
      poolSize: 0,
      groupsFormed: 0,
      unmatched: 0,
    });
    return { poolSize: 0, groups: [], unmatched: [] };
  }

  const { blockedSet, recentSet } = await loadHardConstraints(candidates.map((c) => c.userId));
  const { groups, unmatched } = formGroups(candidates, blockedSet, recentSet);

  const avgCohesion = groups.length
    ? Math.round(groups.reduce((s, g) => s + g.cohesion, 0) / groups.length)
    : null;

  await db.insert(matchRuns).values({
    track: "cafe",
    slotId,
    isDryRun,
    poolSize: candidates.length,
    groupsFormed: groups.length,
    unmatched: unmatched.length,
    avgCohesion: avgCohesion ?? undefined,
  });

  if (isDryRun) {
    return { poolSize: candidates.length, groups, unmatched };
  }

  const cityVenues = await db.select().from(venues).where(and(eq(venues.area, slot.area), eq(venues.active, true)));
  const venue = cityVenues[0];
  const [hh, mm] = TIME_WINDOW_DEFAULTS[slot.window as TimeWindow].split(":").map(Number);
  const meetAt = new Date(`${slot.date}T00:00:00`);
  meetAt.setHours(hh, mm, 0, 0);

  for (const group of groups) {
    const [matchGroup] = await db
      .insert(matchGroups)
      .values({
        track: "cafe",
        slotId,
        venueId: venue?.id,
        tableName: randomTableName(),
        meetAt,
        status: "confirmed",
        cohesionScore: group.cohesion,
      })
      .returning();

    const [room] = await db.insert(chatRooms).values({ groupId: matchGroup.id }).returning();
    await db.update(matchGroups).set({ chatRoomId: room.id }).where(eq(matchGroups.id, matchGroup.id));

    for (const member of group.members) {
      await db.insert(matchGroupMembers).values({
        groupId: matchGroup.id,
        userId: member.userId,
        bookingId: member.bookingId,
      });
      await db.update(bookings).set({ status: "matched", matchGroupId: matchGroup.id }).where(eq(bookings.id, member.bookingId));
      await db.insert(notifications).values({
        userId: member.userId,
        type: "match_confirmed",
        title: "5 strangers said yes to Saturday",
        body: `You're one of them. Table: ${matchGroup.tableName}.`,
      });
    }

    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const a = group.members[i];
        const b = group.members[j];
        const s = pairScore(a.traits, b.traits);
        await db.insert(pairScores).values({
          groupId: matchGroup.id,
          userAId: a.userId,
          userBId: b.userId,
          ...s,
        });
        await db.insert(pastGroupings).values({ userAId: a.userId, userBId: b.userId, groupId: matchGroup.id });
        await db.insert(pastGroupings).values({ userAId: b.userId, userBId: a.userId, groupId: matchGroup.id });
      }
    }

    await db.insert(messages).values({
      roomId: room.id,
      isSystem: true,
      body: `Welcome to ${matchGroup.tableName}. Say hi — names unlock 2 hours before you meet.`,
    });
  }

  for (const c of unmatched) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, c.bookingId)).limit(1);
    await db.update(bookings).set({ status: "refunded" }).where(eq(bookings.id, c.bookingId));
    if (booking) {
      await db
        .update(users)
        .set({ creditsPaise: sql`${users.creditsPaise} + ${booking.amountPaise}` })
        .where(eq(users.id, c.userId));
      await db.insert(auditLog).values({
        actorId: null,
        action: "booking.auto_refund_unmatched",
        targetType: "booking",
        targetId: c.bookingId,
        metadata: { amountPaise: booking.amountPaise },
      });
    }
    await db.insert(notifications).values({
      userId: c.userId,
      type: "unmatched",
      title: "Couldn't find your people this time",
      body: "Your ₹49 is back in your Delulu credits.",
    });
  }

  return { poolSize: candidates.length, groups, unmatched };
}

export async function runMatchingForEvent(eventId: string, isDryRun: boolean) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new Error("Event not found");

  const candidates = await loadEventCandidates(eventId);
  if (!candidates.length) {
    await db.insert(matchRuns).values({ track: "event", eventId, isDryRun, poolSize: 0, groupsFormed: 0, unmatched: 0 });
    return { poolSize: 0, groups: [], unmatched: [] };
  }

  const { blockedSet, recentSet } = await loadHardConstraints(candidates.map((c) => c.userId));
  const { groups, unmatched } = formGroups(candidates, blockedSet, recentSet, {
    min: EVENT_MIN,
    max: EVENT_MAX,
    scoreFn: pairScoreEvent,
  });

  const avgCohesion = groups.length ? Math.round(groups.reduce((s, g) => s + g.cohesion, 0) / groups.length) : null;

  await db.insert(matchRuns).values({
    track: "event",
    eventId,
    isDryRun,
    poolSize: candidates.length,
    groupsFormed: groups.length,
    unmatched: unmatched.length,
    avgCohesion: avgCohesion ?? undefined,
  });

  if (isDryRun) {
    return { poolSize: candidates.length, groups, unmatched };
  }

  const meetAt = new Date(`${event.date}T00:00:00`);
  const [hh, mm] = event.time.split(":").map(Number);
  meetAt.setHours(hh, mm, 0, 0);

  for (const group of groups) {
    const [matchGroup] = await db
      .insert(matchGroups)
      .values({
        track: "event",
        eventId,
        venueId: event.venueId,
        tableName: event.title,
        meetAt,
        status: "confirmed",
        cohesionScore: group.cohesion,
      })
      .returning();

    const [room] = await db.insert(chatRooms).values({ groupId: matchGroup.id }).returning();
    await db.update(matchGroups).set({ chatRoomId: room.id }).where(eq(matchGroups.id, matchGroup.id));

    for (const member of group.members) {
      await db.insert(matchGroupMembers).values({ groupId: matchGroup.id, userId: member.userId, bookingId: member.bookingId });
      await db.update(bookings).set({ status: "matched", matchGroupId: matchGroup.id }).where(eq(bookings.id, member.bookingId));
      await db.insert(notifications).values({
        userId: member.userId,
        type: "match_confirmed",
        title: "Your group's set",
        body: `You're matched into a group for ${event.title}.`,
      });
    }

    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const a = group.members[i];
        const b = group.members[j];
        const s = pairScoreEvent(a.traits, b.traits);
        await db.insert(pairScores).values({ groupId: matchGroup.id, userAId: a.userId, userBId: b.userId, ...s });
        await db.insert(pastGroupings).values({ userAId: a.userId, userBId: b.userId, groupId: matchGroup.id });
        await db.insert(pastGroupings).values({ userAId: b.userId, userBId: a.userId, groupId: matchGroup.id });
      }
    }

    await db.insert(messages).values({
      roomId: room.id,
      isSystem: true,
      body: `Welcome to your group for ${event.title}. Say hi — names unlock 2 hours before you meet.`,
    });
  }

  for (const c of unmatched) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, c.bookingId)).limit(1);
    await db.update(bookings).set({ status: "refunded" }).where(eq(bookings.id, c.bookingId));
    if (booking) {
      await db
        .update(users)
        .set({ creditsPaise: sql`${users.creditsPaise} + ${booking.amountPaise}` })
        .where(eq(users.id, c.userId));
      await db.insert(auditLog).values({
        actorId: null,
        action: "booking.auto_refund_unmatched",
        targetType: "booking",
        targetId: c.bookingId,
        metadata: { amountPaise: booking.amountPaise },
      });
    }
    await db.insert(notifications).values({
      userId: c.userId,
      type: "unmatched",
      title: "Couldn't find your group this time",
      body: "We couldn't form a group for you — it's back in your Delulu credits.",
    });
  }

  return { poolSize: candidates.length, groups, unmatched };
}

const TABLE_ADJ = ["Feral", "Velvet", "Chaotic", "Midnight", "Cosmic", "Unhinged"];
const TABLE_NOUN = ["Croissants", "Gremlins", "Otters", "Nebulas", "Biscuits", "Wanderers"];
function randomTableName(): string {
  const a = TABLE_ADJ[Math.floor(Math.random() * TABLE_ADJ.length)];
  const n = TABLE_NOUN[Math.floor(Math.random() * TABLE_NOUN.length)];
  return `The ${a} ${n}`;
}
