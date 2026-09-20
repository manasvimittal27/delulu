// ── Legacy generic-engine types (still used for interests_categories + intent) ──

export type TraitKey =
  | "socialEnergy"
  | "opennessToNew"
  | "humorStyle"
  | "conversationDepth"
  | "planningStyle"
  | "values"
  | "lifestyle";

export interface TraitDelta {
  trait: TraitKey;
  delta: number;
}

export interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
  traitDeltas?: TraitDelta[];
}

export interface QuizQuestion {
  id: string;
  section: "interests" | "intent";
  type: "single" | "multi" | "slider" | "ranking";
  prompt: string;
  helper?: string;
  minSelect?: number;
  maxSelect?: number;
  options: QuizOption[];
}

export const INTEREST_CATEGORIES: Record<string, { label: string; emoji: string; sub: string[] }> = {
  fitness: { label: "Fitness", emoji: "🏋️", sub: ["running", "yoga", "gym", "swimming", "cycling", "calisthenics", "sports_training"] },
  music: { label: "Music", emoji: "🎵", sub: ["indie", "live_gigs", "bollywood", "hiphop", "edm", "classical", "singing", "production"] },
  food: { label: "Food & Cooking", emoji: "🍜", sub: ["street_food", "baking", "cafe_hopping", "home_cooking", "fine_dining", "biryani_discourse"] },
  travel: { label: "Travel & Outdoors", emoji: "🏕️", sub: ["backpacking", "trekking", "road_trips", "camping", "solo_travel", "offbeat_places"] },
  movies: { label: "Movies & Series", emoji: "🎬", sub: ["bollywood", "korean", "anime_film", "horror", "documentaries", "cult_classics"] },
  books: { label: "Books & Writing", emoji: "📚", sub: ["fiction", "nonfiction", "poetry", "journaling", "fantasy", "book_clubs"] },
  art: { label: "Art & Design", emoji: "🎨", sub: ["painting", "graphic_design", "illustration", "sketching", "street_art"] },
  gaming: { label: "Gaming", emoji: "🎮", sub: ["console", "pc", "mobile", "board_games", "esports", "rpg"] },
  tech: { label: "Tech & Startups", emoji: "💻", sub: ["ai", "building_side_projects", "product", "hackathons", "web3"] },
  sports: { label: "Sports", emoji: "⚽", sub: ["cricket", "football", "badminton", "f1", "basketball"] },
  dance: { label: "Dance", emoji: "💃", sub: ["contemporary", "bollywood_dance", "hiphop_dance", "classical_dance", "social_dance"] },
  photography: { label: "Photography", emoji: "📸", sub: ["street", "portrait", "film", "editing", "travel_photography"] },
  pets: { label: "Pets", emoji: "🐾", sub: ["dogs", "cats", "fostering", "street_animals"] },
  wellness: { label: "Spirituality & Wellness", emoji: "🧘", sub: ["meditation", "astrology", "therapy_curious", "journaling", "breathwork"] },
  fashion: { label: "Fashion & Thrifting", emoji: "👗", sub: ["thrifting", "streetwear", "sustainable_fashion", "styling"] },
  comedy: { label: "Comedy & Memes", emoji: "😂", sub: ["standup", "memes", "improv", "sketch"] },
  cars: { label: "Cars & Bikes", emoji: "🏍️", sub: ["road_trips", "modding", "motorsport", "biking_groups"] },
  finance: { label: "Finance & Investing", emoji: "📈", sub: ["stocks", "crypto", "personal_finance", "side_hustles"] },
  volunteering: { label: "Volunteering & Causes", emoji: "🤝", sub: ["climate", "education", "animal_welfare", "community_work"] },
  anime: { label: "Anime & Manga", emoji: "⛩️", sub: ["shonen", "seinen", "cosplay", "manga_reading", "conventions"] },
};

export const QUIZ_SECTIONS: { id: string; label: string; interstitial: string }[] = [
  { id: "interests", label: "Interests", interstitial: "Section 1 of 3 — tell us what you're into 👀" },
  { id: "personality", label: "Personality", interstitial: "Section 2 of 3 — now the fun part 👀" },
  { id: "intent", label: "Intent", interstitial: "Section 3 of 3 — last one, promise" },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "interests_categories",
    section: "interests",
    type: "multi",
    prompt: "What actually gets you out of bed?",
    helper: "Pick 3-6 that feel like you",
    minSelect: 3,
    maxSelect: 6,
    options: Object.entries(INTEREST_CATEGORIES).map(([id, v]) => ({ id, label: v.label, emoji: v.emoji })),
  },
  {
    id: "intent_here_for",
    section: "intent",
    type: "single",
    prompt: "What are you actually here for?",
    options: [
      { id: "friendship", label: "Friendship" },
      { id: "romantic", label: "Something romantic" },
      { id: "both", label: "Both, I'm flexible" },
      { id: "vibes", label: "Just vibes, no labels" },
    ],
  },
  {
    id: "intent_comfort",
    section: "intent",
    type: "single",
    prompt: "Comfort level for your first meet",
    options: [
      { id: "mixed", label: "Mixed group, definitely" },
      { id: "same_gender", label: "Prefer same-gender group first" },
      { id: "no_preference", label: "No preference" },
    ],
  },
];

// ── Sub-interests (v2 quiz — one screen per chosen category) ──

export interface SubInterestOption {
  slug: string;
  label: string;
}

export interface SubInterestCategory {
  prompt: string;
  options: SubInterestOption[];
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function subCategory(prompt: string, labels: string[]): SubInterestCategory {
  return { prompt, options: labels.map((label) => ({ slug: slugify(label), label })) };
}

export const SUB_INTERESTS: Record<string, SubInterestCategory> = {
  fitness: subCategory("Where does your energy go? 💪", [
    "Running", "Gym / Strength", "Yoga", "Pilates", "Cycling", "Swimming",
    "Hiking / Trekking", "Boxing / Combat", "Dance Fitness", "Meditation / Mobility", "Hyrox", "Sports / Active Games",
  ]),
  music: subCategory("What's usually playing? 🎧", [
    "Bollywood", "Punjabi", "Indie", "Pop", "Hip-Hop / Rap", "Rock", "EDM", "R&B", "K-pop", "Classical", "Regional", "Lo-fi / Chill", "Sufi", "Jazz / Blues",
  ]),
  food: subCategory("What's your kind of food plan? 😋", [
    "Café hopping", "Street food", "Trying new cuisines", "Cooking", "Baking", "Fine dining", "Healthy food", "Finding hidden gems", "Food photography", "Desserts & drinks",
  ]),
  travel: subCategory("What's your kind of escape? 🌍", [
    "Mountains", "Beaches", "Trekking", "Camping", "Road trips", "Exploring cities", "Nature", "Travel photography", "Food trips", "International travel", "Slow / Wellness travel",
  ]),
  movies: subCategory("What's usually on your screen? 👀", [
    "Bollywood / Hindi", "Hollywood / English", "Regional Indian", "K-Dramas", "Anime", "Spanish / International", "Sitcoms", "Crime / Thriller", "Romance", "Horror", "Sci-fi / Fantasy", "Psychological", "Documentaries", "Reality / Competition",
  ]),
  books: subCategory("What's your bookshelf saying? 📚", [
    "Fiction", "Mystery / Thriller", "Romance", "Psychology", "Business", "Finance", "Self-development", "History / Politics", "Science / Technology", "Creative Writing", "Poetry", "Non-fiction",
  ]),
  art: subCategory("Your kind of creative? 🎨", [
    "Painting", "Sketching", "Pottery / Ceramics", "DIY / Crafts", "Fashion / Textile", "Graphic Design / Digital Art", "Kintsugi", "Resin Art", "Museums / Galleries", "Illustration", "Just exploring",
  ]),
  gaming: subCategory("What do you play? 🎮", [
    "FPS / Shooters", "Sports", "Racing", "RPG / Adventure", "Strategy", "Casual / Mobile", "Puzzle", "Horror", "Multiplayer / Co-op", "Board / Tabletop",
  ]),
  tech: subCategory("What part of tech pulls you in? 👀", [
    "AI / ML", "Coding / Software", "Startups", "Product / Building", "Apps & Technology", "Emerging Tech", "Business / Growth", "Design / UX", "VC / Investing", "Side projects", "Web3 / Crypto",
  ]),
  sports: subCategory("What do you actually play or watch? ⚽", [
    "Football", "Cricket", "Basketball", "Badminton", "Tennis", "Table Tennis", "Volleyball", "Swimming", "Athletics / Running", "Boxing", "Other",
  ]),
  dance: subCategory("What's your vibe? 💃", [
    "Bollywood", "Hip-Hop", "Contemporary", "Salsa / Bachata", "Bharatanatyam / Classical", "K-pop", "Jazz", "Freestyle", "Garba / Folk", "Just-for-fun",
  ]),
  photography: subCategory("What do you love capturing? 📸", [
    "Portraits", "Street / Cities", "Nature", "Landscapes", "Food", "Fashion", "Architecture", "Animals", "Travel", "Film / Analog", "Mobile Photography", "Anything aesthetic",
  ]),
  pets: subCategory("Animal person? 🐾", [
    "Dogs", "Cats", "Small pets", "Birds", "Animals / Outdoors", "Animal welfare", "Pet parenting",
  ]),
  wellness: subCategory("What's your kind of wellness? 🌱", [
    "Yoga", "Meditation", "Spirituality", "Mindfulness", "Philosophy", "Breathwork", "Self-reflection", "Slow living", "Wellness / Relaxation",
  ]),
  fashion: subCategory("Your fashion rabbit hole? 👀", [
    "Shopping", "Thrifting", "Styling", "Sneakers", "Jewellery / Accessories", "DIY / Customisation", "Fashion photography", "Beauty / Makeup", "Luxury", "Streetwear",
  ]),
  comedy: subCategory("What's your humour? 😂", [
    "Memes", "Dark humour", "Sarcasm", "Stand-up", "Roasting", "Absurd / Random", "Wholesome", "Sitcoms", "Internet culture", "Dad jokes",
  ]),
  cars: subCategory("What are you into? 🏎️", [
    "Cars", "Bikes", "Motorsport / Racing", "Modifications", "Automotive tech", "Road trips", "Car spotting", "DIY / Mechanics",
  ]),
  finance: subCategory("What's your money rabbit hole? 💸", [
    "Personal finance", "Stocks", "Mutual Funds", "Startups", "Venture Capital", "Crypto", "Economics", "Real Estate", "Trading", "Business",
  ]),
  volunteering: subCategory("What kind of causes matter to you? 🤝", [
    "Animal welfare", "Environment", "Children / Education", "Elderly care", "Community work", "Food / Hunger", "Mental wellbeing", "Accessibility / Inclusion", "Social impact", "General volunteering",
  ]),
  anime: subCategory("What's your anime world? 👀", [
    "Shonen", "Romance", "Slice of Life", "Isekai", "Psychological", "Sports", "Fantasy", "Action", "Manga", "Anime movies", "Just getting started",
  ]),
};

// Comedy sub-interests that set the humourEdge signal directly.
export const HUMOUR_EDGE_HIGH_SLUGS = ["dark_humour", "roasting"];
export const HUMOUR_EDGE_LOW_SLUGS = ["wholesome"];

// ── Personality questions (v2) ──

export type PersonalityNumericTrait =
  | "socialInitiation"
  | "conversationDepth"
  | "disagreementTolerance"
  | "spontaneity"
  | "groupEnergyPref"
  | "adaptability"
  | "humourEngagement";

export type PersonalityCategoricalTrait = "humourStyle" | "airtimeStyle";

export interface PersonalityOption {
  value: string;
  label: string;
  traits: Partial<Record<PersonalityNumericTrait, number>> & Partial<Record<PersonalityCategoricalTrait, string>>;
}

export interface PersonalityQuestion {
  id: string;
  prompt: string;
  measures: PersonalityNumericTrait | PersonalityCategoricalTrait;
  options: PersonalityOption[];
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: "p1_group_of_strangers",
    prompt: "When you're with a group of people you don't know...",
    measures: "socialInitiation",
    options: [
      { value: "starts", label: "I'll probably start talking to someone first", traits: { socialInitiation: 90 } },
      { value: "seeks", label: "I'll find someone who seems approachable", traits: { socialInitiation: 65 } },
      { value: "observes", label: "I'll observe for a bit before joining in..", traits: { socialInitiation: 35 } },
      { value: "needs_intro", label: "Please introduce me to someone :)", traits: { socialInitiation: 15 } },
    ],
  },
  {
    id: "p2_three_hour_cafe",
    prompt: "You have a 3-hour café hangout. What sounds best?",
    measures: "conversationDepth",
    options: [
      { value: "chaos", label: "Random stories, jokes and chaos!", traits: { conversationDepth: 25, humourEngagement: 20 } },
      { value: "deep", label: "Getting into surprisingly deep conversations", traits: { conversationDepth: 90 } },
      { value: "ideas", label: "Talking about interests, careers, ideas, life", traits: { conversationDepth: 65 } },
      { value: "mix", label: "A mix, depends on the people", traits: { conversationDepth: 50, adaptability: 25 } },
    ],
  },
  {
    id: "p3_disagreement",
    prompt: "Someone at the table says something you completely disagree with.",
    measures: "disagreementTolerance",
    options: [
      { value: "curious", label: "“Wait, why do you think that?” Let's discuss", traits: { disagreementTolerance: 85, conversationDepth: 10 } },
      { value: "debates", label: "I'll debate it if they're up for it 😂", traits: { disagreementTolerance: 95 } },
      { value: "lets_go", label: "Interesting. I probably won't argue about it", traits: { disagreementTolerance: 40 } },
      { value: "deflects", label: "I'll change the topic before this becomes a TED Talk", traits: { disagreementTolerance: 15 } },
    ],
  },
  {
    id: "p4_something_random",
    prompt: "Your friend says, “Let's do something completely random tomorrow.”",
    measures: "spontaneity",
    options: [
      { value: "in", label: "Letss go!", traits: { spontaneity: 95 } },
      { value: "depends", label: "Depends how random..", traits: { spontaneity: 60 } },
      { value: "brief_me", label: "Tell me what we're doing first 😭", traits: { spontaneity: 35 } },
      { value: "notice", label: "I need at least 48 hours' notice!", traits: { spontaneity: 10 } },
    ],
  },
  {
    id: "p5_ideal_group",
    prompt: "Your ideal group has...",
    measures: "groupEnergyPref",
    options: [
      { value: "high", label: "People who keep the energy high!!", traits: { groupEnergyPref: 90 } },
      { value: "balanced", label: "A few talkative people + a few chill people ;)", traits: { groupEnergyPref: 55 } },
      { value: "calm", label: "Mostly calm people and meaningful conversation", traits: { groupEnergyPref: 25 } },
      { value: "agnostic", label: "I don't care as long as they're interesting", traits: { groupEnergyPref: 50, adaptability: 25 } },
    ],
  },
  {
    id: "p6_ridiculous_joke",
    prompt: "Someone at the table makes a ridiculous joke. You...",
    measures: "humourStyle",
    options: [
      { value: "absurd", label: "Add to it and make it worse 😂", traits: { humourStyle: "absurd", humourEngagement: 95 } },
      { value: "banter", label: "Laugh and throw one back", traits: { humourStyle: "banter", humourEngagement: 75 } },
      { value: "dry", label: "Smile politely and move on", traits: { humourStyle: "dry", humourEngagement: 35 } },
      { value: "wholesome", label: "I'm probably the one who didn't get the joke 😭", traits: { humourStyle: "wholesome", humourEngagement: 25 } },
    ],
  },
  {
    id: "p7_one_person_talking",
    prompt: "You're at an event and one person is doing most of the talking. You...",
    measures: "airtimeStyle",
    options: [
      { value: "driver", label: "Join in and match their energy!", traits: { airtimeStyle: "driver", socialInitiation: 15 } },
      { value: "includer", label: "Try to bring quieter people into the conversation", traits: { airtimeStyle: "includer" } },
      { value: "listener", label: "I'm happy listening :)", traits: { airtimeStyle: "listener" } },
      { value: "pair_bonder", label: "I'll find a way to have a one-on-one with someone", traits: { airtimeStyle: "pair_bonder" } },
    ],
  },
];

// ── Vibe archetypes ──

export interface VibeArchetype {
  id: string;
  name: string;
  description: string;
}

export const VIBE_ARCHETYPES: VibeArchetype[] = [
  { id: "golden_retriever", name: "The Human Golden Retriever", description: "Instantly friendly, zero chill needed to talk to you." },
  { id: "philosopher", name: "The 3AM Philosopher", description: "Turns any conversation into an existential detour." },
  { id: "includer", name: "The One Who Makes Sure Everyone Talks", description: "Notices who's gone quiet and pulls them back in." },
  { id: "chaos_quiet", name: "Chaos, But Quietly", description: "Down for anything, as long as it's a small anything." },
  { id: "deadpan_diver", name: "Deadpan Deep Diver", description: "Dry humor, surprisingly deep questions." },
  { id: "wildcard", name: "The Wildcard", description: "Nobody knows what you'll say next, including you." },
  { id: "quiet_observer", name: "The Quiet Observer", description: "Says less, notices everything." },
  { id: "hype_engine", name: "The Hype Engine", description: "Your energy makes the whole table louder." },
  { id: "debate_captain", name: "The Debate Captain", description: "Will absolutely discuss that, thank you for bringing it up." },
  { id: "pair_bonder", name: "The One-on-One Specialist", description: "Groups are fine, but the real conversation happens on the side." },
];

/** Derives an archetype id from a completed trait vector. */
export function chooseArchetype(traits: {
  socialInitiation: number;
  conversationDepth: number;
  disagreementTolerance: number;
  spontaneity: number;
  groupEnergyPref: number;
  humourStyle?: string | null;
  airtimeStyle?: string | null;
}): string {
  const { socialInitiation, conversationDepth, disagreementTolerance, spontaneity, groupEnergyPref, humourStyle, airtimeStyle } = traits;

  if (airtimeStyle === "includer") return "includer";
  if (airtimeStyle === "pair_bonder") return "pair_bonder";
  if (disagreementTolerance >= 80) return "debate_captain";
  if (spontaneity >= 75 && groupEnergyPref <= 35) return "chaos_quiet";
  if (socialInitiation >= 75 && (humourStyle === "absurd" || humourStyle === "banter")) return "golden_retriever";
  if (socialInitiation <= 35 && conversationDepth >= 70) return "philosopher";
  if (socialInitiation <= 30 && airtimeStyle === "listener") return "quiet_observer";
  if (groupEnergyPref >= 75 && socialInitiation >= 60) return "hype_engine";
  if (humourStyle === "dry" && conversationDepth >= 55) return "deadpan_diver";
  return "wildcard";
}
