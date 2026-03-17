export type Recipient = "dad" | "mom" | "partner" | "friend" | "kids" | "teen" | "grandparent" | "colleague";
export type Interest = "tech" | "outdoors" | "cooking" | "gaming" | "music" | "fitness" | "reading" | "art" | "travel" | "sports";

// Maps recipient + interest combinations to real product search queries
const QUERY_MAP: Record<string, string[]> = {
  "dad-tech":       ["portable bluetooth speaker", "smart watch men", "wireless earbuds", "portable phone charger", "drone camera"],
  "dad-outdoors":   ["fishing rod gift", "camping lantern", "hiking backpack", "binoculars", "multi tool knife"],
  "dad-cooking":    ["cast iron skillet", "BBQ grill tools set", "meat thermometer", "smoker chips set", "apron chef"],
  "dad-gaming":     ["gaming controller", "gaming headset", "gaming chair", "PC gaming mouse", "gaming desk lamp"],
  "dad-music":      ["guitar picks set", "bluetooth turntable", "piano keyboard", "guitar tuner", "music stand"],
  "dad-fitness":    ["resistance bands set", "foam roller", "fitness tracker", "jump rope", "workout gloves"],
  "dad-reading":    ["book light", "kindle e-reader", "reading glasses", "bookmarks set", "book stand"],
  "dad-sports":     ["sports water bottle", "golf balls", "basketball", "sports bag", "fitness tracker"],
  "dad-travel":     ["travel pillow", "luggage organizer", "portable power bank", "travel adapter", "packing cubes"],
  "dad-art":        ["sketch pad set", "watercolor set", "drawing pencils", "canvas art", "art supply kit"],

  "mom-tech":       ["tablet stand", "wireless charging pad", "smart display", "noise cancelling headphones", "digital photo frame"],
  "mom-cooking":    ["air fryer", "cookbook bestseller", "spice rack set", "kitchen utensils set", "instant pot"],
  "mom-fitness":    ["yoga mat", "resistance bands", "fitness water bottle", "running shoes", "gym bag"],
  "mom-reading":    ["kindle paperwhite", "cozy book light", "book club tote bag", "reading journal", "book stand"],
  "mom-art":        ["watercolor set", "adult coloring book", "calligraphy set", "scrapbook kit", "painting canvas set"],
  "mom-travel":     ["travel cosmetics bag", "passport holder", "packing cubes", "silk travel pillow", "travel journal"],
  "mom-music":      ["bluetooth speaker", "record player", "wireless earbuds", "music journal", "ukulele beginner"],
  "mom-outdoors":   ["garden tool set", "bird feeder", "hiking hat", "outdoor chair", "picnic blanket"],
  "mom-sports":     ["yoga pants", "sports water bottle", "tennis racket", "walking shoes", "fitness tracker"],
  "mom-gaming":     ["puzzle 1000 piece", "card game", "board game family", "word game", "trivia game"],

  "partner-tech":   ["couples smart watch", "wireless earbuds", "phone camera lens kit", "smart home device", "portable projector"],
  "partner-cooking":["cooking class gift", "wine glasses set", "cheese board set", "pasta maker", "cocktail kit"],
  "partner-fitness":["couple yoga mat", "fitness tracker", "gym bag", "running shoes", "workout set"],
  "partner-travel": ["travel journal couples", "luggage set", "passport holders set", "travel camera", "adventure map"],
  "partner-music":  ["concert tickets gift card", "vinyl record", "bluetooth speaker", "instrument beginner", "music streaming gift"],
  "partner-reading":["book subscription", "kindle", "matching bookmarks", "reading lamp", "book lover tote"],
  "partner-art":    ["paint and sip kit", "polaroid camera", "art print custom", "sketch book", "pottery kit"],
  "partner-gaming": ["two player card game", "couples board game", "VR headset", "gaming controller", "puzzle couples"],
  "partner-outdoors":["hiking boots", "tent camping", "hammock outdoor", "adventure journal", "stargazing kit"],
  "partner-sports": ["running shoes", "tennis set", "cycling gear", "sports watch", "swim bag"],

  "kids-tech":      ["kids tablet", "kids camera", "learning robot toy", "kids smartwatch", "coding kit kids"],
  "kids-outdoors":  ["kids bike helmet", "bug catching kit", "kids fishing rod", "outdoor explorer kit", "kite"],
  "kids-gaming":    ["kids board game", "Nintendo Switch game", "LEGO set", "kids VR", "card game kids"],
  "kids-art":       ["kids art set", "colored pencils", "playdough set", "kids easel", "craft kit kids"],
  "kids-reading":   ["childrens book set", "kids bookshelf", "book light kids", "audiobook player kids", "reading reward chart"],
  "kids-music":     ["kids guitar", "kids keyboard", "drum pad kids", "kids microphone", "music toy"],
  "kids-sports":    ["kids soccer ball", "kids basketball hoop", "jump rope kids", "kids skateboard", "sports set kids"],
  "kids-cooking":   ["kids baking set", "kids cooking kit", "easy bake oven", "kids chef apron", "cookie cutter set"],
  "kids-fitness":   ["kids yoga mat", "kids jump rope", "balance board kids", "kids bike", "gymnastics mat"],
  "kids-travel":    ["kids backpack", "travel games kids", "kids luggage", "travel activity book", "kids neck pillow"],

  "teen-tech":      ["wireless earbuds teens", "ring light selfie", "portable charger", "gaming mouse", "phone stand"],
  "teen-gaming":    ["gaming headset", "gaming controller", "gaming chair", "game gift card", "mechanical keyboard"],
  "teen-music":     ["ukulele beginner", "bluetooth speaker teens", "vinyl record player", "guitar beginner", "studio headphones"],
  "teen-fitness":   ["resistance bands teens", "jump rope", "skateboard", "sports water bottle", "fitness tracker teens"],
  "teen-art":       ["sketchbook teens", "calligraphy set", "embroidery kit teens", "resin art kit", "painting set teens"],
  "teen-reading":   ["young adult novel", "kindle teens", "journal notebook", "book light", "bookmarks teens"],
  "teen-outdoors":  ["hammock teens", "hiking shoes", "camping gear teens", "bike accessories", "outdoor camera"],
  "teen-cooking":   ["teen baking kit", "cookbook teens", "waffle maker", "cotton candy machine", "popcorn maker"],
  "teen-travel":    ["travel backpack teens", "passport holder", "travel journal teens", "portable speaker", "camera"],
  "teen-sports":    ["sports gear teens", "basketball", "skateboard", "yoga mat teens", "sports bag teens"],

  "grandparent-tech":     ["digital photo frame", "large button phone", "tablet senior", "audiobook player", "smart speaker"],
  "grandparent-reading":  ["large print books", "kindle large text", "magnifying glass", "book stand", "reading lamp"],
  "grandparent-cooking":  ["easy recipe cookbook", "slow cooker", "tea set", "biscuit tin", "kitchen timer"],
  "grandparent-outdoors": ["garden kneeler", "bird feeder", "walking stick", "sun hat", "garden tool set"],
  "grandparent-music":    ["CD player", "bluetooth speaker simple", "music memory player", "song book", "kazoo fun"],
  "grandparent-fitness":  ["walking shoes", "resistance bands senior", "yoga DVD", "balance board", "pedometer"],
  "grandparent-art":      ["coloring book adults", "watercolor beginner", "knitting kit", "puzzle 500 piece", "cross stitch kit"],
  "grandparent-gaming":   ["jigsaw puzzle", "card game classic", "dominos set", "chess set", "word puzzle book"],
  "grandparent-travel":   ["travel pillow", "compression socks travel", "pill organizer travel", "photo album", "luggage tag"],
  "grandparent-sports":   ["golf club", "bowling bag", "fishing gear", "bocce ball set", "cornhole game"],

  "friend-tech":    ["wireless earbuds", "phone accessories", "mini projector", "smart plug", "portable charger"],
  "friend-cooking": ["hot sauce set", "cookbook trendy", "cocktail kit", "snack subscription", "baking kit"],
  "friend-fitness": ["resistance bands", "yoga mat", "gym bag", "water bottle", "fitness tracker"],
  "friend-gaming":  ["board game friends", "party card game", "trivia game", "game night set", "puzzle"],
  "friend-music":   ["concert gift card", "vinyl record", "bluetooth speaker", "music subscription card", "instrument"],
  "friend-reading": ["bestseller novel", "book tote bag", "kindle", "book subscription box", "reading journal"],
  "friend-art":     ["paint night kit", "polaroid camera", "art supply set", "craft kit", "journal set"],
  "friend-outdoors":["hiking water bottle", "camping mug", "outdoor hammock", "adventure journal", "trail mix set"],
  "friend-travel":  ["travel accessories", "scratch map world", "luggage tag", "travel candle set", "passport holder"],
  "friend-sports":  ["sports water bottle", "gym accessories", "sports bag", "fitness gear", "running belt"],

  "colleague-tech":     ["wireless mouse", "desk organizer tech", "cable management", "USB hub", "phone stand desk"],
  "colleague-cooking":  ["coffee gift set", "tea sampler", "snack box", "tumbler mug", "desk candy jar"],
  "colleague-fitness":  ["desk stretching band", "standing desk mat", "water bottle", "posture corrector", "stress ball"],
  "colleague-reading":  ["desk notebook", "pen set quality", "bookmarks", "book light", "planner 2026"],
  "colleague-gaming":   ["desk game fidget", "card game office", "mini arcade", "brain teaser", "puzzle desk"],
  "colleague-music":    ["desk bluetooth speaker", "noise cancelling earbuds", "white noise machine", "music stand", "headphone stand"],
  "colleague-art":      ["desk plant", "sticky note set", "pen holder", "calendar art", "motivational print"],
  "colleague-outdoors": ["travel mug", "reusable bag", "desk succulent", "nature calendar", "seed growing kit"],
  "colleague-travel":   ["luggage tag", "travel pouch", "passport wallet", "travel adapter", "packing cube"],
  "colleague-sports":   ["sports water bottle", "desk fidget spinner", "mini basketball hoop desk", "stress ball", "fitness band"],
};

export function getGiftQueries(
  recipient: Recipient,
  interests: Interest[],
  budget?: number
): string[] {
  const queries: string[] = [];

  for (const interest of interests.slice(0, 3)) {
    const key = `${recipient}-${interest}`;
    const mapped = QUERY_MAP[key];
    if (mapped) {
      // Pick 2 queries per interest
      queries.push(...mapped.slice(0, 2));
    }
  }

  // Fallback if nothing mapped
  if (queries.length === 0) {
    queries.push(`gift for ${recipient}`, `${recipient} gift ideas`);
  }

  return [...new Set(queries)].slice(0, 6);
}

export const RECIPIENTS: { id: Recipient; label: string; emoji: string }[] = [
  { id: "dad", label: "Dad", emoji: "👨" },
  { id: "mom", label: "Mom", emoji: "👩" },
  { id: "partner", label: "Partner", emoji: "💑" },
  { id: "friend", label: "Friend", emoji: "🤝" },
  { id: "kids", label: "Kids", emoji: "🧒" },
  { id: "teen", label: "Teen", emoji: "🧑" },
  { id: "grandparent", label: "Grandparent", emoji: "👴" },
  { id: "colleague", label: "Colleague", emoji: "💼" },
];

export const INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: "tech", label: "Tech", emoji: "📱" },
  { id: "outdoors", label: "Outdoors", emoji: "🏕️" },
  { id: "cooking", label: "Cooking", emoji: "🍳" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "reading", label: "Reading", emoji: "📚" },
  { id: "art", label: "Art", emoji: "🎨" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "sports", label: "Sports", emoji: "⚽" },
];

export const BUDGETS = [
  { label: "Under $25", max: 25 },
  { label: "$25 – $50", max: 50 },
  { label: "$50 – $100", max: 100 },
  { label: "$100 – $200", max: 200 },
  { label: "$200+", max: 500 },
];
