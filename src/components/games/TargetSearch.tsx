import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

export const TargetSearch: React.FC<Props> = ({ difficulty, onComplete }) => {
  const targetCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 7;
  const gridSize = difficulty === "easy" ? 16 : difficulty === "medium" ? 20 : 25;
  const gridCols = difficulty === "easy" ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-5";

  const [targetSymbol] = useState("⭐");
  const [distractors] = useState(["🌙", "☀️", "☁️", "⚡", "✨"]);
  const [items, setItems] = useState<{ id: number; symbol: string; isTarget: boolean; isFound: boolean }[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    // Generate random positions for targets
    const targetIndices = new Set<number>();
    while (targetIndices.size < targetCount) {
      targetIndices.add(Math.floor(Math.random() * gridSize));
    }

    const grid: { id: number; symbol: string; isTarget: boolean; isFound: boolean }[] = [];
    for (let i = 0; i < gridSize; i++) {
      if (targetIndices.has(i)) {
        grid.push({ id: i, symbol: targetSymbol, isTarget: true, isFound: false });
      } else {
        const randDist = distractors[Math.floor(Math.random() * distractors.length)];
        grid.push({ id: i, symbol: randDist, isTarget: false, isFound: false });
      }
    }
    setItems(grid);
  }, [difficulty]);

  const handleTap = (index: number) => {
    const item = items[index];
    if (item.isFound) return;

    playClickSound();

    if (item.isTarget) {
      playSuccessSound();
      const updated = items.map((it, idx) => (idx === index ? { ...it, isFound: true } : it));
      setItems(updated);
      const nextFound = foundCount + 1;
      setFoundCount(nextFound);

      if (nextFound === targetCount) {
        const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const accuracy = Math.round((targetCount / (targetCount + mistakes)) * 100);
        const score = Math.max(70, Math.round(100 - mistakes * 7));
        setTimeout(() => {
          onComplete({ score, mistakes, accuracy, timeSpent });
        }, 500);
      }
    } else {
      playMistakeSound();
      setMistakes((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
        <span className="text-lg font-medium">Found: <strong className="text-emerald-700">{foundCount} / {targetCount}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl w-full text-center mb-6">
        <span className="text-slate-700 text-base">Tap all <strong>{targetCount}</strong> stars: </span>
        <span className="text-3xl ml-2">⭐</span>
      </div>

      <div className={`grid ${gridCols} gap-2.5 w-full`}>
        {items.map((it, idx) => (
          <button
            key={it.id}
            id={`target-search-btn-${it.id}`}
            onClick={() => handleTap(idx)}
            disabled={it.isFound}
            className={`h-16 sm:h-20 rounded-2xl border-2 flex items-center justify-center text-3xl sm:text-4xl transition-all shadow-xs cursor-pointer ${
              it.isFound
                ? "bg-emerald-100 border-emerald-500 ring-4 ring-emerald-200 scale-95 opacity-80 cursor-default"
                : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 active:scale-95"
            }`}
          >
            {it.symbol}
          </button>
        ))}
      </div>
    </div>
  );
};
