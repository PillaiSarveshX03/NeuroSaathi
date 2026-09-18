import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

const ITEMS_COLLECTION = [
  { emoji: "🍎", name: "Apple" },
  { emoji: "🔑", name: "Key" },
  { emoji: "👓", name: "Glasses" },
  { emoji: "☕", name: "Cup" },
  { emoji: "📱", name: "Phone" },
  { emoji: "⌚", name: "Watch" },
  { emoji: "🌻", name: "Flower" },
  { emoji: "📖", name: "Book" },
];

export const WhatMissing: React.FC<Props> = ({ difficulty, onComplete }) => {
  const itemCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;
  const [phase, setPhase] = useState<"initial" | "curtain" | "question">("initial");
  const [initialItems, setInitialItems] = useState<{ emoji: string; name: string }[]>([]);
  const [remainingItems, setRemainingItems] = useState<{ emoji: string; name: string }[]>([]);
  const [missingItem, setMissingItem] = useState<{ emoji: string; name: string } | null>(null);
  const [options, setOptions] = useState<{ emoji: string; name: string }[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const shuffled = [...ITEMS_COLLECTION].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, itemCount);
    setInitialItems(chosen);

    // Pick 1 to remove
    const removeIdx = Math.floor(Math.random() * chosen.length);
    const removed = chosen[removeIdx];
    setMissingItem(removed);

    const remaining = chosen.filter((_, idx) => idx !== removeIdx);
    setRemainingItems(remaining);

    // Build 4 options including the removed item
    const unused = shuffled.slice(itemCount);
    const optPool = [removed, ...unused.slice(0, 3)].sort(() => Math.random() - 0.5);
    setOptions(optPool);

    // Initial countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger brief curtain
          setPhase("curtain");
          setTimeout(() => {
            setPhase("question");
          }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [difficulty]);

  const handleSelectOption = (item: { emoji: string; name: string }) => {
    if (!missingItem) return;
    playClickSound();

    if (item.name === missingItem.name) {
      playSuccessSound();
      const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const accuracy = Math.round((1 / (1 + mistakes)) * 100);
      const score = Math.max(70, Math.round(100 - mistakes * 10));
      setTimeout(() => {
        onComplete({ score, mistakes, accuracy, timeSpent });
      }, 500);
    } else {
      playMistakeSound();
      setMistakes((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {phase === "initial" && (
        <div className="flex flex-col items-center text-center p-6 bg-amber-50/80 rounded-3xl border border-amber-200 w-full">
          <span className="text-sm uppercase tracking-wider text-amber-800 font-semibold mb-1">Remember the tray</span>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Look at all these items on the tray:</h3>
          <p className="text-slate-600 mb-6">One will be removed in <strong className="text-amber-800 text-xl">{countdown}s</strong></p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
            {initialItems.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white border-2 border-amber-200 flex flex-col items-center justify-center shadow-xs"
              >
                <span className="text-5xl mb-1">{item.emoji}</span>
                <span className="text-base font-semibold text-slate-700">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "curtain" && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900 rounded-3xl w-full h-72 text-white text-center animate-pulse">
          <div className="text-5xl mb-3">🪄</div>
          <h3 className="text-2xl font-bold">One item is being hidden...</h3>
        </div>
      )}

      {phase === "question" && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
            <span className="text-lg font-medium">Tray has {remainingItems.length} items left</span>
            <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
          </div>

          <div className="p-4 bg-slate-100 rounded-2xl w-full mb-6 border border-slate-200">
            <div className="flex flex-wrap justify-center gap-3">
              {remainingItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-slate-300 flex items-center gap-2 shadow-xs">
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="font-semibold text-slate-700">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 text-center">
            Which item was taken away?
          </h3>

          <div className="grid grid-cols-2 gap-3 w-full">
            {options.map((opt, i) => (
              <button
                key={i}
                id={`what-missing-opt-${i}`}
                onClick={() => handleSelectOption(opt)}
                className="p-4 rounded-2xl bg-white hover:bg-blue-50 border-2 border-slate-300 hover:border-blue-500 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="text-lg font-bold text-slate-800">{opt.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
