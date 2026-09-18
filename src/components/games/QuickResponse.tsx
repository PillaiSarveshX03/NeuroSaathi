import React, { useState, useEffect, useRef } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

type SignalType = "wait" | "green" | "red";

export const QuickResponse: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalRounds = difficulty === "easy" ? 6 : difficulty === "medium" ? 8 : 10;
  const [round, setRound] = useState(0);
  const [signal, setSignal] = useState<SignalType>("wait");
  const [mistakes, setMistakes] = useState(0);
  const [successfulTaps, setSuccessfulTaps] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    scheduleNextSignal();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [round]);

  const scheduleNextSignal = () => {
    setSignal("wait");
    const delay = 1200 + Math.random() * 1500;

    timerRef.current = setTimeout(() => {
      // 70% chance of green (Go), 30% chance of red (No-Go)
      const isGreen = Math.random() > 0.3;
      setSignal(isGreen ? "green" : "red");

      // Auto-advance if it was red and user refrained correctly
      if (!isGreen) {
        timerRef.current = setTimeout(() => {
          advanceRound(false);
        }, 1600);
      }
    }, delay);
  };

  const advanceRound = (wasTappedOnGreen: boolean) => {
    if (round + 1 >= totalRounds) {
      playSuccessSound();
      const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const accuracy = Math.round((totalRounds / (totalRounds + mistakes)) * 100);
      const score = Math.max(70, Math.round(100 - mistakes * 9));
      onComplete({ score, mistakes, accuracy, timeSpent });
    } else {
      setRound((prev) => prev + 1);
    }
  };

  const handleAreaTap = () => {
    playClickSound();

    if (signal === "green") {
      // Correct tap on Green!
      playSuccessSound();
      setSuccessfulTaps((prev) => prev + 1);
      advanceRound(true);
    } else if (signal === "red") {
      // Mistake! Tapped on Red (No-Go error)
      playMistakeSound();
      setMistakes((prev) => prev + 1);
      advanceRound(false);
    } else {
      // Tapped too early while waiting
      playMistakeSound();
      setMistakes((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
        <span className="text-lg font-medium">Test: <strong>{round + 1} / {totalRounds}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="text-center mb-4 text-slate-700 font-medium">
        Rule: Tap ONLY when the circle turns <strong className="text-emerald-700 font-bold">GREEN</strong>. If it turns <strong className="text-rose-700 font-bold">RED</strong>, DO NOT TAP!
      </div>

      <button
        id="quick-response-target"
        onClick={handleAreaTap}
        className={`w-full h-64 sm:h-72 rounded-3xl flex flex-col items-center justify-center transition-all duration-150 border-4 cursor-pointer shadow-lg active:scale-95 ${
          signal === "green"
            ? "bg-emerald-500 border-emerald-300 text-white animate-pulse"
            : signal === "red"
            ? "bg-rose-500 border-rose-300 text-white"
            : "bg-slate-200 border-slate-300 text-slate-500"
        }`}
      >
        {signal === "green" ? (
          <>
            <span className="text-6xl mb-2">⚡</span>
            <span className="text-4xl font-extrabold uppercase tracking-wide">TAP NOW!</span>
          </>
        ) : signal === "red" ? (
          <>
            <span className="text-6xl mb-2">🛑</span>
            <span className="text-3xl font-extrabold uppercase tracking-wide">STOP! WAIT!</span>
          </>
        ) : (
          <>
            <span className="text-5xl mb-2">⏳</span>
            <span className="text-2xl font-bold">Wait for color...</span>
          </>
        )}
      </button>
    </div>
  );
};
