import "dotenv/config";
import { db, sql } from "./client";
import { venues, hosts, events, users, userTraits, meetSlots, icebreakerPrompts, bookings } from "./schema";
import { AVATARS } from "../routes/identity";

const AREAS: { city: string; area: string }[] = [
  { city: "Bengaluru", area: "Indiranagar" },
  { city: "Bengaluru", area: "Koramangala" },
  { city: "Bengaluru", area: "HSR" },
  { city: "Bengaluru", area: "Jayanagar" },
  { city: "Delhi", area: "Hauz Khas" },
  { city: "Delhi", area: "CP" },
  { city: "Delhi", area: "GK" },
  { city: "Mumbai", area: "Bandra" },
  { city: "Mumbai", area: "Andheri" },
  { city: "Mumbai", area: "Lower Parel" },
  { city: "Pune", area: "Koregaon Park" },
  { city: "Pune", area: "Baner" },
];

const ADJ = ["velvet", "chaotic", "midnight", "feral", "cosmic", "salty", "dreamy", "jazzy", "unhinged", "wobbly", "spicy", "gremlin", "sleepy", "electric", "rogue"];
const NOUN = ["penguin", "samosa", "gremlin", "croissant", "otter", "raccoon", "mango", "wizard", "potato", "nebula", "biscuit", "yeti", "walrus", "pigeon", "noodle"];

const ICEBREAKERS: { category: string; prompt: string }[] = [
  { category: "weird", prompt: "Weirdest fact you know that you can't prove?" },
  { category: "weird", prompt: "What's a smell that instantly takes you back to childhood?" },
  { category: "deep", prompt: "What's a belief you've changed your mind about recently?" },
  { category: "deep", prompt: "What does 'home' actually mean to you?" },
  { category: "funny", prompt: "Most delulu thing you've ever believed?" },
  { category: "funny", prompt: "Which of us is going to be late?" },
  { category: "would_you_rather", prompt: "Would you rather lose your phone or your wallet?" },
  { category: "would_you_rather", prompt: "Would you rather always be 10 min early or always 10 min late?" },
  { category: "hot_take", prompt: "Hot take: pineapple on pizza is correct." },
  { category: "hot_take", prompt: "Best ₹100 you've ever spent?" },
];
while (ICEBREAKERS.length < 60) {
  ICEBREAKERS.push({
    category: ["weird", "deep", "funny", "would_you_rather", "hot_take"][ICEBREAKERS.length % 5],
    prompt: `Icebreaker #${ICEBREAKERS.length + 1}: tell the table something true and slightly unhinged.`,
  });
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

export async function runSeed() {
  console.log("Seeding venues...");
  const venueRows = await db
    .insert(venues)
    .values(
      AREAS.map((a) => ({
        name: `${a.area} Coffee Co. (demo)`,
        city: a.city,
        area: a.area,
        address: `${a.area}, ${a.city}`,
        capacity: 6,
        isDemoSeed: true,
      }))
    )
    .returning();

  console.log("Seeding icebreakers...");
  await db.insert(icebreakerPrompts).values(ICEBREAKERS);

  console.log("Seeding admin...");
  await db.insert(users).values({
    phone: "9999999999",
    username: "delulu_admin",
    onboardingStep: "done",
    city: "Bengaluru",
    role: "admin",
    termsAcceptedAt: new Date(),
  });

  console.log("Seeding hosts...");
  const [hostUser1] = await db
    .insert(users)
    .values({ phone: "9000000001", username: "verified_host_demo", onboardingStep: "done", city: "Bengaluru", role: "host" })
    .returning();
  const [hostUser2] = await db
    .insert(users)
    .values({ phone: "9000000002", username: "pending_host_demo", onboardingStep: "done", city: "Mumbai", role: "host" })
    .returning();
  const [hostUser3] = await db
    .insert(users)
    .values({ phone: "9000000003", username: "rejected_host_demo", onboardingStep: "done", city: "Delhi", role: "host" })
    .returning();

  const [hostVerified] = await db
    .insert(hosts)
    .values({ userId: hostUser1.id, name: "Verified Host", organization: "Weekend Trails", status: "verified", commissionBps: 1500 })
    .returning();
  await db.insert(hosts).values({ userId: hostUser2.id, name: "Pending Host", organization: "New Collective", status: "pending" });
  await db.insert(hosts).values({ userId: hostUser3.id, name: "Rejected Host", organization: "Sketch Co", status: "rejected" });

  console.log("Seeding events...");
  const eventDefs = [
    { title: "Board Game Chaos Night", category: "board_games", price: 29900 },
    { title: "Open Mic: First Timers Welcome", category: "open_mic", price: 19900 },
    { title: "Sunrise Trek + Chai", category: "trek", price: 49900 },
    { title: "Pottery for Beginners", category: "pottery", price: 89900 },
    { title: "5-a-side Football Meetup", category: "football", price: 29900 },
    { title: "Trivia Night: Pop Culture", category: "trivia", price: 24900 },
    { title: "Silent Book Club", category: "books", price: 14900 },
    { title: "Street Food Walk", category: "food_walk", price: 39900 },
  ];
  const today = new Date();
  for (let i = 0; i < eventDefs.length; i++) {
    const def = eventDefs[i];
    const area = pick(AREAS);
    const venue = venueRows.find((v) => v.area === area.area)!;
    const date = new Date(today);
    date.setDate(date.getDate() + randInt(2, 30));
    const isDeluluHosted = i % 3 === 0;
    await db.insert(events).values({
      hostId: isDeluluHosted ? null : hostVerified.id,
      isDeluluHosted,
      title: def.title,
      description: `A demo Delulu event: ${def.title}. Seeded prototype data.`,
      category: def.category,
      city: area.city,
      area: area.area,
      venueId: venue.id,
      date: date.toISOString().slice(0, 10),
      time: "18:30",
      pricePaise: def.price,
      capacity: randInt(6, 10),
      vibeTags: ["chaotic good", "curious", "low pressure"],
      interestTags: [def.category],
      status: "published",
      isDemoSeed: true,
    });
  }

  console.log("Seeding 40 demo users with trait vectors...");
  const usedUsernames = new Set<string>();
  const demoUserIds: string[] = [];
  for (let i = 0; i < 40; i++) {
    let username = `${pick(ADJ)}_${pick(NOUN)}`;
    while (usedUsernames.has(username)) username = `${pick(ADJ)}_${pick(NOUN)}_${i}`;
    usedUsernames.add(username);

    const area = pick(AREAS);
    const [u] = await db
      .insert(users)
      .values({
        phone: `90000010${String(i).padStart(2, "0")}`,
        username,
        avatarId: pick(AVATARS),
        avatarColor: pick(["#A78BFA", "#FF5DA2", "#C4F542", "#FF8A3D", "#5CC8FF"]),
        city: area.city,
        pincode: area.city === "Bengaluru" ? "560001" : area.city === "Delhi" ? "110001" : area.city === "Mumbai" ? "400001" : "411001",
        dob: `${randInt(1995, 2006)}-0${randInt(1, 9)}-1${randInt(0, 8)}`,
        gender: pick(["male", "female", "non_binary"]),
        onboardingStep: "done",
        termsAcceptedAt: new Date(),
      })
      .returning();
    demoUserIds.push(u.id);

    await db.insert(userTraits).values({
      userId: u.id,
      socialEnergy: randInt(10, 95),
      opennessToNew: randInt(10, 95),
      humorStyle: randInt(10, 95),
      conversationDepth: randInt(10, 95),
      planningStyle: randInt(10, 95),
      valuesScore: randInt(10, 95),
      lifestyleScore: randInt(10, 95),
      interests: Object.fromEntries(
        Array.from({ length: randInt(3, 6) }, () => pick(["fitness", "music", "food", "travel", "movies", "books", "art", "gaming", "tech", "comedy"])).map((c) => [c, []])
      ),
      intent: pick(["friendship", "romantic", "both", "vibes"]),
      groupComfort: pick(["mixed", "same_gender", "no_preference"]),
    });

    // give each demo user a slot booking in the pool for tomorrow evening in their area
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + 1);
    const dateStr = slotDate.toISOString().slice(0, 10);
    const found = (await db.select().from(meetSlots)).find(
      (s) => s.date === dateStr && s.window === "evening" && s.area === area.area
    );
    let slotRow = found;
    if (!slotRow) {
      const [inserted] = await db
        .insert(meetSlots)
        .values({ date: dateStr, window: "evening", area: area.area, city: area.city, track: "cafe" })
        .returning();
      slotRow = inserted;
    }

    await db.insert(bookings).values({
      userId: u.id,
      track: "cafe",
      slotId: slotRow.id,
      intent: pick(["friendship", "both"]),
      groupComfort: pick(["mixed", "no_preference"]),
      status: "in_pool",
      amountPaise: 4900,
    });
  }

  console.log(`Seed complete. Users: ${demoUserIds.length}, venues: ${venueRows.length}`);
}

const isCliEntry = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isCliEntry) {
  runSeed()
    .then(() => sql.end())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
