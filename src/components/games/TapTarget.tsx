import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

export const TapTarget: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalTargets = difficulty === "easy" ? 6 : difficulty === "medium" ? 8 : 10;
  const [tappedCount, setTappedCount] = useState(0);
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [startTime] = useState<number>(Date.now());
  const [targetSize] = useState(difficulty === "easy" ? 80 : difficulty === "medium" ? 68 : 56);

  useEffect(() => {
    moveTarget();
  }, []);

  const moveTarget = () => {
    // Generate percentage coordinates ensuring target stays fully in bounds
    const x = 15 + Math.floor(Math.random() * 70);
    const y = 15 + Math.floor(Math.random() * 70);
    setTargetPos({ x, y });
  };

  const handleTargetTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();

    const nextCount = tappedCount + 1;
    setTappedCount(nextCount);

    if (nextCount >= totalTargets) {
      playSuccessSound();
      const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const score = Math.max(75, Math.round(100 - (timeSpent / totalTargets) * 5));
      setTimeout(() => {
        onComplete({ score, mistakes: 0, accuracy: 100, timeSpent });
      }, 300);
    } else {
      moveTarget();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
        <span className="text-lg font-medium">Targets Tapped: <strong className="text-emerald-700">{tappedCount} / {totalTargets}</strong></span>
        <span className="text-sm font-semibold text-slate-500">Speed & Motor Test</span>
      </div>

      <p className="text-slate-600 mb-3 text-center">
        Tap the pulsing blue target as soon as it appears!
      </p>

      {/* Interactive Arena */}
      <div className="relative w-full h-80 sm:h-96 bg-slate-100 border-2 border-slate-300 rounded-3xl overflow-hidden shadow-inner">
        <button
          id="tap-target-button"
          onClick={handleTargetTap}
          style={{
            left: `${targetPos.x}%`,
            top: `${targetPos.y}%`,
            width: `${targetSize}px`,
            height: `${targetSize}px`,
            transform: "translate(-50%, -50%)",
          }}
          className="absolute rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-2xl shadow-xl border-4 border-white active:scale-90 transition-transform cursor-pointer flex items-center justify-center animate-pulse ring-8 ring-blue-200"
        >
          🎯
        </button>
      </div>
    </div>
  );
};
