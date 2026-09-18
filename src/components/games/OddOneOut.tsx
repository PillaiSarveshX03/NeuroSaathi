import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

interface OddQuestion {
  items: { emoji: string; name: string; isOdd: boolean }[];
  explanation: string;
}

const ODD_POOLS: OddQuestion[] = [
  {
    items: [
      { emoji: "🍎", name: "Apple", isOdd: false },
      { emoji: "🍌", name: "Banana", isOdd: false },
      { emoji: "🥕", name: "Carrot", isOdd: true },
      { emoji: "🍇", name: "Grapes", isOdd: false },
    ],
    explanation: "Carrot is a root vegetable, while the others are fruits!",
  },
  {
    items: [
      { emoji: "🐶", name: "Dog", isOdd: false },
      { emoji: "🐱", name: "Cat", isOdd: false },
      { emoji: "🚗", name: "Car", isOdd: true },
      { emoji: "🐰", name: "Rabbit", isOdd: false },
    ],
    explanation: "A car is a vehicle, while the others are living animals!",
  },
  {
    items: [
      { emoji: "⚽", name: "Soccer", isOdd: false },
      { emoji: "🏀", name: "Basketball", isOdd: false },
      { emoji: "🎾", name: "Tennis", isOdd: false },
      { emoji: "🎸", name: "Guitar", isOdd: true },
    ],
    explanation: "Guitar is a musical instrument, while the others are sports balls!",
  },
  {
    items: [
      { emoji: "🕊️", name: "Dove", isOdd: false },
      { emoji: "🦅", name: "Eagle", isOdd: false },
      { emoji: "🐬", name: "Dolphin", isOdd: true },
      { emoji: "🦜", name: "Parrot", isOdd: false },
    ],
    explanation: "Dolphin swims in the ocean, while the others are flying birds!",
  },
  {
    items: [
      { emoji: "☕", name: "Tea/Coffee", isOdd: false },
      { emoji: "🥛", name: "Milk", isOdd: false },
      { emoji: "🥪", name: "Sandwich", isOdd: true },
      { emoji: "🧃", name: "Juice", isOdd: false },
    ],
    explanation: "Sandwich is solid food, while the others are beverages to drink!",
  },
];

export const OddOneOut: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalRounds = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const [currentRound, setCurrentRound] = useState(0);
  const [questions, setQuestions] = useState<OddQuestion[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const shuffled = [...ODD_POOLS]
      .sort(() => Math.random() - 0.5)
      .map((q) => ({
        ...q,
        items: [...q.items].sort(() => Math.random() - 0.5),
      }));
    setQuestions(shuffled.slice(0, totalRounds));
  }, [difficulty]);

  const currentQ = questions[currentRound];

  const handleSelect = (isOdd: boolean) => {
    if (!currentQ || feedback) return;
    playClickSound();

    if (isOdd) {
      playSuccessSound();
      setFeedback(currentQ.explanation);
      setTimeout(() => {
        setFeedback(null);
        if (currentRound + 1 >= totalRounds) {
          const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
          const accuracy = Math.round((totalRounds / (totalRounds + mistakes)) * 100);
          const score = Math.max(70, Math.round(100 - mistakes * 7));
          onComplete({ score, mistakes, accuracy, timeSpent });
        } else {
          setCurrentRound((prev) => prev + 1);
        }
      }, 1500);
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
        Which one does NOT belong with the others?
      </div>

      <div className="grid grid-cols-2 gap-4 w-full mb-6">
        {currentQ.items.map((item, idx) => (
          <button
            key={idx}
            id={`odd-item-btn-${idx}`}
            onClick={() => handleSelect(item.isOdd)}
            className="h-28 sm:h-32 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <span className="text-4xl sm:text-5xl">{item.emoji}</span>
            <span className="text-base font-semibold text-slate-700">{item.name}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-medium text-center animate-fade-in">
          ✅ {feedback}
        </div>
      )}
    </div>
  );
};
