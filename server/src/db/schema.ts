import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  varchar,
  date,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const genderEnum = pgEnum("gender", ["male", "female", "non_binary", "prefer_not_to_say"]);
export const trackEnum = pgEnum("track", ["cafe", "event"]);
export const timeWindowEnum = pgEnum("time_window", ["morning", "afternoon", "evening", "night"]);
export const intentEnum = pgEnum("intent", ["friendship", "romantic", "both", "vibes"]);
export const groupComfortEnum = pgEnum("group_comfort", ["mixed", "same_gender", "no_preference"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending_payment",
  "in_pool",
  "matched",
  "completed",
  "cancelled",
  "refunded",
  "unmatched",
]);
export const groupStatusEnum = pgEnum("group_status", ["forming", "confirmed", "completed", "cancelled"]);
export const hostStatusEnum = pgEnum("host_status", ["pending", "verified", "rejected"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "pending_approval", "published", "cancelled"]);
export const reportCategoryEnum = pgEnum("report_category", [
  "harassment",
  "no_show",
  "fake_profile",
  "safety_concern",
  "spam",
  "other",
]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "paid"]);
export const userRoleEnum = pgEnum("user_role", ["user", "host", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 10 }).notNull().unique(),
  email: text("email"),
  dob: date("dob"),
  pincode: varchar("pincode", { length: 6 }),
  city: text("city"),
  gender: genderEnum("gender"),
  referralCode: text("referral_code"),
  role: userRoleEnum("role").notNull().default("user"),
  username: text("username").unique(),
  avatarId: text("avatar_id"),
  avatarColor: text("avatar_color"),
  onboardingStep: text("onboarding_step").notNull().default("profile"),
  trustScore: integer("trust_score").notNull().default(100),
  strikes: integer("strikes").notNull().default(0),
  suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  creditsPaise: integer("credits_paise").notNull().default(0),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 10 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  phoneIdx: index("otp_phone_idx").on(t.phone),
}));

export const quizResponses = pgTable("quiz_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  answer: jsonb("answer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userQuestionUnique: unique().on(t.userId, t.questionId),
}));

export const userTraits = pgTable("user_traits", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  socialEnergy: integer("social_energy").notNull().default(50),
  opennessToNew: integer("openness_to_new").notNull().default(50),
  humorStyle: integer("humor_style").notNull().default(50),
  conversationDepth: integer("conversation_depth").notNull().default(50),
  planningStyle: integer("planning_style").notNull().default(50),
  valuesScore: integer("values_score").notNull().default(50),
  lifestyleScore: integer("lifestyle_score").notNull().default(50),
  interests: jsonb("interests").notNull().default({}),
  intent: intentEnum("intent"),
  groupComfort: groupComfortEnum("group_comfort"),
  preferredGenders: jsonb("preferred_genders").notNull().default([]),
  ageRangeMin: integer("age_range_min"),
  ageRangeMax: integer("age_range_max"),
  archetypeId: text("archetype_id"),
  // New behavioural trait model (quiz v2) — supersedes the numeric fields
  // above for scoring purposes; those are kept only for old rows.
  socialInitiation: integer("social_initiation").notNull().default(50),
  groupEnergyPref: integer("group_energy_pref").notNull().default(50),
  disagreementTolerance: integer("disagreement_tolerance").notNull().default(50),
  spontaneity: integer("spontaneity").notNull().default(50),
  adaptability: integer("adaptability").notNull().default(50),
  humourStyleCategory: text("humour_style"),
  humourEngagement: integer("humour_engagement").notNull().default(50),
  humourEdge: text("humour_edge"),
  airtimeStyle: text("airtime_style"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  area: text("area").notNull(),
  address: text("address").notNull(),
  capacity: integer("capacity").notNull().default(6),
  active: boolean("active").notNull().default(true),
  isDemoSeed: boolean("is_demo_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetSlots = pgTable("meet_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  window: timeWindowEnum("window").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  track: trackEnum("track").notNull().default("cafe"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slotIdx: index("meet_slot_idx").on(t.date, t.window, t.area),
}));

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  track: trackEnum("track").notNull(),
  slotId: uuid("slot_id").references(() => meetSlots.id),
  eventId: uuid("event_id"),
  groupSizePref: text("group_size_pref"),
  intent: intentEnum("intent").notNull(),
  groupComfort: groupComfortEnum("group_comfort").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending_payment"),
  amountPaise: integer("amount_paise").notNull(),
  paymentOrderId: text("payment_order_id"),
  matchGroupId: uuid("match_group_id"),
  dietaryPref: text("dietary_pref"),
  fitnessLevel: text("fitness_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchGroups = pgTable("match_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  track: trackEnum("track").notNull(),
  slotId: uuid("slot_id").references(() => meetSlots.id),
  eventId: uuid("event_id"),
  venueId: uuid("venue_id").references(() => venues.id),
  tableName: text("table_name"),
  meetAt: timestamp("meet_at", { withTimezone: true }).notNull(),
  status: groupStatusEnum("status").notNull().default("forming"),
  cohesionScore: integer("cohesion_score"),
  chatRoomId: uuid("chat_room_id"),
  revealedAt: timestamp("revealed_at", { withTimezone: true }),
  lastIcebreakerAt: timestamp("last_icebreaker_at", { withTimezone: true }),
  remindersSent: jsonb("reminders_sent").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchGroupMembers = pgTable("match_group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => matchGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  groupUserUnique: unique().on(t.groupId, t.userId),
}));

export const pairScores = pgTable("pair_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => matchGroups.id, { onDelete: "cascade" }),
  userAId: uuid("user_a_id").notNull().references(() => users.id),
  userBId: uuid("user_b_id").notNull().references(() => users.id),
  overall: integer("overall").notNull(),
  interests: integer("interests").notNull(),
  conversation: integer("conversation").notNull(),
  socialInitiationFit: integer("social_initiation_fit").notNull().default(0),
  groupEnergyFit: integer("group_energy_fit").notNull().default(0),
  humourFit: integer("humour_fit").notNull().default(0),
  disagreementFit: integer("disagreement_fit").notNull().default(0),
  spontaneityFit: integer("spontaneity_fit").notNull().default(0),
  // Deprecated (quiz v1 scoring) — kept nullable for old rows.
  personality: integer("personality"),
  values: integer("values"),
  lifestyle: integer("lifestyle"),
  humor: integer("humor"),
  age: integer("age"),
});

export const blockedPairs = pgTable("blocked_pairs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  blockedUserId: uuid("blocked_user_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairUnique: unique().on(t.userId, t.blockedUserId),
}));

export const pastGroupings = pgTable("past_groupings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userAId: uuid("user_a_id").notNull().references(() => users.id),
  userBId: uuid("user_b_id").notNull().references(() => users.id),
  groupId: uuid("group_id").notNull().references(() => matchGroups.id),
  metAt: timestamp("met_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hosts = pgTable("hosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  organization: text("organization"),
  instagram: text("instagram"),
  concept: text("concept"),
  previousEvents: text("previous_events"),
  upiId: text("upi_id"),
  status: hostStatusEnum("status").notNull().default("pending"),
  commissionBps: integer("commission_bps").notNull().default(1500),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").references(() => hosts.id),
  isDeluluHosted: boolean("is_delulu_hosted").notNull().default(false),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  coverImageUrl: text("cover_image_url"),
  city: text("city").notNull(),
  area: text("area").notNull(),
  venueId: uuid("venue_id").references(() => venues.id),
  date: date("date").notNull(),
  time: text("time").notNull(),
  pricePaise: integer("price_paise").notNull(),
  capacity: integer("capacity").notNull(),
  vibeTags: jsonb("vibe_tags").notNull().default([]),
  interestTags: jsonb("interest_tags").notNull().default([]),
  status: eventStatusEnum("status").notNull().default("draft"),
  isDemoSeed: boolean("is_demo_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => hosts.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  grossPaise: integer("gross_paise").notNull(),
  commissionPaise: integer("commission_paise").notNull(),
  hostPayablePaise: integer("host_payable_paise").notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  upiRef: text("upi_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => matchGroups.id, { onDelete: "cascade" }),
  isCircle: boolean("is_circle").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id),
  isSystem: boolean("is_system").notNull().default(false),
  body: text("body").notNull(),
  replyToId: uuid("reply_to_id"),
  reactions: jsonb("reactions").notNull().default({}),
  poll: jsonb("poll"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  roomIdx: index("message_room_idx").on(t.roomId, t.createdAt),
}));

export const messageReads = pgTable("message_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  lastReadMessageId: uuid("last_read_message_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  roomUserUnique: unique().on(t.roomId, t.userId),
}));

export const icebreakerPrompts = pgTable("icebreaker_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  prompt: text("prompt").notNull(),
  active: boolean("active").notNull().default(true),
});

export const circleConnections = pgTable("circle_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userAId: uuid("user_a_id").notNull().references(() => users.id),
  userBId: uuid("user_b_id").notNull().references(() => users.id),
  userAAdded: boolean("user_a_added").notNull().default(false),
  userBAdded: boolean("user_b_added").notNull().default(false),
  mutualAt: timestamp("mutual_at", { withTimezone: true }),
  chatRoomId: uuid("chat_room_id").references(() => chatRooms.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairUnique: unique().on(t.userAId, t.userBId),
}));

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  reportedUserId: uuid("reported_user_id").references(() => users.id),
  groupId: uuid("group_id").references(() => matchGroups.id),
  category: reportCategoryEnum("category").notNull(),
  details: text("details"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetupFeedback = pgTable("meetup_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => matchGroups.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rating: integer("rating"),
  noShowUserIds: jsonb("no_show_user_ids").notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const safetyCheckins = pgTable("safety_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => matchGroups.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 10 }).notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("notification_user_idx").on(t.userId, t.createdAt),
}));

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 10 }),
  city: text("city").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchRuns = pgTable("match_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  track: trackEnum("track").notNull(),
  slotId: uuid("slot_id"),
  eventId: uuid("event_id"),
  isDryRun: boolean("is_dry_run").notNull().default(false),
  poolSize: integer("pool_size").notNull(),
  groupsFormed: integer("groups_formed").notNull(),
  unmatched: integer("unmatched").notNull(),
  avgCohesion: integer("avg_cohesion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  traits: one(userTraits, { fields: [users.id], references: [userTraits.userId] }),
  bookings: many(bookings),
}));

export const matchGroupsRelations = relations(matchGroups, ({ many, one }) => ({
  members: many(matchGroupMembers),
  venue: one(venues, { fields: [matchGroups.venueId], references: [venues.id] }),
}));

export const matchGroupMembersRelations = relations(matchGroupMembers, ({ one }) => ({
  group: one(matchGroups, { fields: [matchGroupMembers.groupId], references: [matchGroups.id] }),
  user: one(users, { fields: [matchGroupMembers.userId], references: [users.id] }),
}));
