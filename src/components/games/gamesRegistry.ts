export interface GameMeta {
  id: string;
  name: string;
  category: "Memory" | "Attention" | "Problem Solving" | "Language" | "Motor & Speed" | "Reflex";
  description: string;
  icon: string;
  benefits: string;
}

export const ALL_COGNITIVE_GAMES: GameMeta[] = [
  {
    id: "card-matching",
    name: "Card Matching",
    category: "Memory",
    description: "Flip paired cards to find matches and train short-term recall.",
    icon: "🎴",
    benefits: "Strengthens visual working memory and associative retention.",
  },
  {
    id: "sequence-memory",
    name: "Remember the Sequence",
    category: "Memory",
    description: "Watch the flashing sequence of colored buttons and repeat it.",
    icon: "🔁",
    benefits: "Builds sequential memory span and pattern storage.",
  },
  {
    id: "number-sequence",
    name: "Number Sequence",
    category: "Problem Solving",
    description: "Identify math patterns and deduce which number comes next.",
    icon: "🔢",
    benefits: "Exercises arithmetic intuition and logical reasoning.",
  },
  {
    id: "simple-sudoku",
    name: "Simple Sudoku",
    category: "Problem Solving",
    description: "Fill a gentle 4×4 grid where numbers 1–4 appear once per row, column, and block.",
    icon: "🧩",
    benefits: "Promotes systematic analysis and spatial deductive logic.",
  },
  {
    id: "pattern-completion",
    name: "Complete the Pattern",
    category: "Problem Solving",
    description: "Determine the missing symbol in repeating sequences of shapes and colors.",
    icon: "🔷",
    benefits: "Enhances visual problem solving and inductive reasoning.",
  },
  {
    id: "odd-one-out",
    name: "Odd One Out",
    category: "Attention",
    description: "Discriminate the one object that does not fit the category group.",
    icon: "🔍",
    benefits: "Sharpens category classification and selective attention.",
  },
  {
    id: "find-object",
    name: "Find the Object",
    category: "Attention",
    description: "Locate a specific target hidden amongst similar distractors.",
    icon: "🕵️",
    benefits: "Stimulates visual search efficiency and field scanning.",
  },
  {
    id: "target-search",
    name: "Target Search",
    category: "Attention",
    description: "Locate and tap every occurrence of the target item across the board.",
    icon: "⭐",
    benefits: "Boosts sustained attention and visual persistence.",
  },
  {
    id: "word-recall",
    name: "Word Recall",
    category: "Memory",
    description: "Study a list of words, then select the words that appeared from memory.",
    icon: "📝",
    benefits: "Bolsters verbal memory, semantic encoding, and retention.",
  },
  {
    id: "complete-word",
    name: "Complete the Word",
    category: "Language",
    description: "Fill in the missing letter of familiar words using helpful clues.",
    icon: "🔤",
    benefits: "Maintains vocabulary fluency and lexical retrieval.",
  },
  {
    id: "picture-memory",
    name: "Picture Memory",
    category: "Memory",
    description: "Look at pictures, then answer whether specific items were present.",
    icon: "🖼️",
    benefits: "Reinforces episodic memory and visual recognition.",
  },
  {
    id: "what-missing",
    name: "What Was Missing?",
    category: "Memory",
    description: "A tray of items is briefly covered. Detect which item was removed.",
    icon: "👀",
    benefits: "Fosters change detection and immediate visual recall.",
  },
  {
    id: "tap-target",
    name: "Tap the Target",
    category: "Motor & Speed",
    description: "Tap the pulsing circle as soon as it appears on screen.",
    icon: "🎯",
    benefits: "Improves hand-eye coordination and motor processing speed.",
  },
  {
    id: "quick-response",
    name: "Quick Response",
    category: "Reflex",
    description: "Tap rapidly when the circle turns Green, but refrain when it turns Red.",
    icon: "⚡",
    benefits: "Trains response inhibition, cognitive control, and reflexes.",
  },
];
