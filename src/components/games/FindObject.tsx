import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

const CANDIDATES = [
  { target: "🐱", name: "Cat", distractors: ["🐶", "🐰", "🐼", "🐻", "🦊", "🐯"] },
  { target: "🍎", name: "Red Apple", distractors: ["🍌", "🍇", "🍊", "🍉", "🍓", "🍍"] },
  { target: "⭐", name: "Star", distractors: ["🌙", "☀️", "☁️", "⚡", "🌈", "🔥"] },
  { target: "☕", name: "Tea Cup", distractors: ["🥛", "🥤", "🧃", "🍵", "🍶", "🍾"] },
  { target: "🌻", name: "Sunflower", distractors: ["🌹", "🌷", "🌸", "🌺", "🌼", "💐"] },
];

export const FindObject: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalRounds = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const gridSize = difficulty === "easy" ? 9 : difficulty === "medium" ? 16 : 25;
  const gridCols = difficulty === "easy" ? "grid-cols-3" : difficulty === "medium" ? "grid-cols-4" : "grid-cols-5";

  const [currentRound, setCurrentRound] = useState(0);
  const [targetItem, setTargetItem] = useState<{ target: string; name: string } | null>(null);
  const [gridItems, setGridItems] = useState<{ id: number; symbol: string; isTarget: boolean }[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    setupRound(currentRound);
  }, [currentRound, difficulty]);

  const setupRound = (roundIdx: number) => {
    const candidate = CANDIDATES[roundIdx % CANDIDATES.length];
    setTargetItem({ target: candidate.target, name: candidate.name });

    const targetPos = Math.floor(Math.random() * gridSize);
    const items: { id: number; symbol: string; isTarget: boolean }[] = [];

    for (let i = 0; i < gridSize; i++) {
      if (i === targetPos) {
        items.push({ id: i, symbol: candidate.target, isTarget: true });
      } else {
        const randDist = candidate.distractors[Math.floor(Math.random() * candidate.distractors.length)];
        items.push({ id: i, symbol: randDist, isTarget: false });
      }
    }

    setGridItems(items);
  };

  const handleItemClick = (item: { id: number; symbol: string; isTarget: boolean }) => {
    playClickSound();

    if (item.isTarget) {
      playSuccessSound();
      setTimeout(() => {
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

  if (!targetItem) return null;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
        <span className="text-lg font-medium">Round: <strong>{currentRound + 1} / {totalRounds}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl w-full text-center mb-6">
        <span className="text-slate-600 text-base">Find this item: </span>
        <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-xl shadow-xs border border-blue-200 ml-2">
          <span className="text-3xl">{targetItem.target}</span>
          <strong className="text-blue-900 text-lg">{targetItem.name}</strong>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-2.5 w-full`}>
        {gridItems.map((item) => (
          <button
            key={item.id}
            id={`find-obj-btn-${item.id}`}
            onClick={() => handleItemClick(item)}
            className="h-16 sm:h-20 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center text-3xl sm:text-4xl transition-all shadow-xs cursor-pointer active:scale-90"
          >
            {item.symbol}
          </button>
        ))}
      </div>
    </div>
  );
};
