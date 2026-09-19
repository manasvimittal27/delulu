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
  section: "interests" | "personality" | "values" | "lifestyle" | "intent";
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

export const QUIZ_SECTIONS: { id: QuizQuestion["section"]; label: string; interstitial: string }[] = [
  { id: "interests", label: "Interests", interstitial: "Section 1 of 5 — tell us what you're into 👀" },
  { id: "personality", label: "Personality", interstitial: "Section 2 of 5 — now the weird questions 👀" },
  { id: "values", label: "Values", interstitial: "Section 3 of 5 — the hot takes" },
  { id: "lifestyle", label: "Lifestyle", interstitial: "Section 4 of 5 — almost there" },
  { id: "intent", label: "Intent", interstitial: "Section 5 of 5 — last one, promise" },
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
    id: "personality_saturday",
    section: "personality",
    type: "single",
    prompt: "It's 9 PM Saturday. Your phone buzzes: \"house party, 20 people, come now.\"",
    options: [
      { id: "go_now", label: "Already putting on shoes", traitDeltas: [{ trait: "socialEnergy", delta: 15 }, { trait: "opennessToNew", delta: 10 }] },
      { id: "maybe_later", label: "Reply 'maybe' and see how I feel", traitDeltas: [{ trait: "socialEnergy", delta: 5 }, { trait: "planningStyle", delta: -5 }] },
      { id: "stay_in", label: "Hard pass, I'm in bed with a show", traitDeltas: [{ trait: "socialEnergy", delta: -15 }] },
      { id: "counter_offer", label: "Counter with 'come to mine, it's calmer'", traitDeltas: [{ trait: "socialEnergy", delta: 5 }, { trait: "planningStyle", delta: 10 }] },
    ],
  },
  {
    id: "personality_stranger",
    section: "personality",
    type: "single",
    prompt: "A stranger at the table goes quiet for a while. You:",
    options: [
      { id: "fill_silence", label: "Fill the silence with a random question", traitDeltas: [{ trait: "socialEnergy", delta: 10 }, { trait: "conversationDepth", delta: 5 }] },
      { id: "let_it_sit", label: "Let it sit, silence is fine", traitDeltas: [{ trait: "socialEnergy", delta: -10 } ] },
      { id: "check_in", label: "Quietly check if they're okay", traitDeltas: [{ trait: "conversationDepth", delta: 15 }] },
    ],
  },
  {
    id: "personality_dial",
    section: "personality",
    type: "slider",
    prompt: "Introvert 🐢 to Extrovert 🦩",
    options: [],
  },
  {
    id: "values_hot_take",
    section: "values",
    type: "single",
    prompt: "Hot take: small talk about the weather should be illegal.",
    options: [
      { id: "agree", label: "Strongly agree", traitDeltas: [{ trait: "values", delta: 10 }, { trait: "conversationDepth", delta: 10 }] },
      { id: "neutral", label: "Depends on my mood", traitDeltas: [{ trait: "values", delta: 0 }] },
      { id: "disagree", label: "Small talk is underrated", traitDeltas: [{ trait: "values", delta: -10 }] },
    ],
  },
  {
    id: "lifestyle_pace",
    section: "lifestyle",
    type: "single",
    prompt: "Your ideal Sunday pace is:",
    options: [
      { id: "packed", label: "Packed with plans", traitDeltas: [{ trait: "lifestyle", delta: 15 }] },
      { id: "balanced", label: "One plan, rest is unplanned", traitDeltas: [{ trait: "lifestyle", delta: 0 }] },
      { id: "slow", label: "Nothing on the calendar", traitDeltas: [{ trait: "lifestyle", delta: -15 }] },
    ],
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

export const VIBE_ARCHETYPES: { id: string; name: string; description: string }[] = [
  { id: "golden_retriever", name: "The Human Golden Retriever", description: "Instantly friendly, zero chill needed to talk to you." },
  { id: "philosopher", name: "The 3AM Philosopher", description: "Turns any conversation into an existential detour." },
  { id: "group_chat_admin", name: "The Group Chat Admin", description: "Keeps the plan alive when everyone else forgets." },
  { id: "chaos_gremlin", name: "Chaos Gremlin", description: "Unpredictable in the best possible way." },
  { id: "deadpan_diver", name: "Deadpan Deep Diver", description: "Dry humor, surprisingly deep questions." },
  { id: "wildcard", name: "The Wildcard", description: "Nobody knows what you'll say next, including you." },
  { id: "quiet_observer", name: "The Quiet Observer", description: "Says less, notices everything." },
  { id: "hype_engine", name: "The Hype Engine", description: "Your energy makes the whole table louder." },
  { id: "planner", name: "The Overprepared Planner", description: "Has a backup plan for the backup plan." },
  { id: "romantic_dreamer", name: "The Romantic Dreamer", description: "Believes in the plot twist. Always." },
];
