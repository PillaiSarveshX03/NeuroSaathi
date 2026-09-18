import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

interface PatternQuestion {
  items: string[];
  options: string[];
  correctAnswer: string;
  rule: string;
}

const PATTERN_POOLS = [
  {
    items: ["🔴", "🔵", "🔴", "🔵", "?"],
    correctAnswer: "🔴",
    options: ["🔴", "🔵", "🟡", "🟢"],
    rule: "Alternating Red & Blue Circles",
  },
  {
    items: ["⭐", "⭐", "🌙", "⭐", "⭐", "?"],
    correctAnswer: "🌙",
    options: ["🌙", "⭐", "☀️", "☁️"],
    rule: "Two Stars followed by One Moon",
  },
  {
    items: ["🔺", "🟩", "🔺", "🟩", "?"],
    correctAnswer: "🔺",
    options: ["🔺", "🟩", "🟡", "🔷"],
    rule: "Alternating Triangle & Square",
  },
  {
    items: ["🍎", "🍌", "🍎", "🍌", "🍎", "?"],
    correctAnswer: "🍌",
    options: ["🍌", "🍎", "🍇", "🍊"],
    rule: "Alternating Apple & Banana",
  },
  {
    items: ["🌸", "🌸", "🌻", "🌸", "🌸", "?"],
    correctAnswer: "🌻",
    options: ["🌻", "🌸", "🌹", "🌷"],
    rule: "Two Cherry Blossoms then One Sunflower",
  },
  {
    items: ["1️⃣", "2️⃣", "3️⃣", "1️⃣", "2️⃣", "?"],
    correctAnswer: "3️⃣",
    options: ["3️⃣", "4️⃣", "1️⃣", "2️⃣"],
    rule: "Repeating 1, 2, 3 sequence",
  },
];

export const PatternCompletion: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalRounds = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const [currentRound, setCurrentRound] = useState(0);
  const [questions, setQuestions] = useState<PatternQuestion[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  useEffect(() => {
    const shuffled = [...PATTERN_POOLS].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, totalRounds));
  }, [difficulty]);

  const currentQ = questions[currentRound];

  const handleSelect = (opt: string) => {
    if (!currentQ) return;
    playClickSound();
    setSelectedOpt(opt);

    if (opt === currentQ.correctAnswer) {
      playSuccessSound();
      setTimeout(() => {
        setSelectedOpt(null);
        if (currentRound + 1 >= totalRounds) {
          const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
          const accuracy = Math.round((totalRounds / (totalRounds + mistakes)) * 100);
          const score = Math.max(70, Math.round(100 - mistakes * 8));
          onComplete({ score, mistakes, accuracy, timeSpent });
        } else {
          setCurrentRound((prev) => prev + 1);
        }
      }, 500);
    } else {
      playMistakeSound();
      setMistakes((prev) => prev + 1);
    }
  };

  if (!currentQ) return null;

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center mb-6 px-2 text-slate-700">
        <span className="text-lg font-medium">Round: <strong>{currentRound + 1} / {totalRounds}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="text-xl sm:text-2xl font-semibold text-slate-800 mb-6 text-center">
        Which symbol completes the pattern?
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8">
        {currentQ.items.map((item, idx) => (
          <div
            key={idx}
            className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl border-2 text-3xl sm:text-4xl shadow-sm ${
              item === "?"
                ? "bg-amber-100 border-amber-400 text-amber-900 ring-4 ring-amber-200 animate-pulse font-bold"
                : "bg-white border-slate-200"
            }`}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            id={`pattern-opt-${i}`}
            onClick={() => handleSelect(opt)}
            className={`py-5 rounded-2xl text-4xl border-2 transition-all cursor-pointer flex items-center justify-center ${
              selectedOpt === opt
                ? opt === currentQ.correctAnswer
                  ? "bg-emerald-100 border-emerald-500 scale-105"
                  : "bg-rose-100 border-rose-500"
                : "bg-white hover:bg-slate-50 border-slate-300 hover:border-blue-500 shadow-sm"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
