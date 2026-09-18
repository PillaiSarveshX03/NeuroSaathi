import React, { useState, useEffect, useRef } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

const COLORS = [
  { id: 0, label: "Red", bg: "bg-rose-500", activeBg: "bg-rose-300 ring-8 ring-rose-300 scale-105" },
  { id: 1, label: "Blue", bg: "bg-blue-500", activeBg: "bg-blue-300 ring-8 ring-blue-300 scale-105" },
  { id: 2, label: "Green", bg: "bg-emerald-500", activeBg: "bg-emerald-300 ring-8 ring-emerald-300 scale-105" },
  { id: 3, label: "Amber", bg: "bg-amber-500", activeBg: "bg-amber-300 ring-8 ring-amber-300 scale-105" },
];

export const SequenceMemory: React.FC<Props> = ({ difficulty, onComplete }) => {
  const targetLength = difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 7;
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [isShowingSequence, setIsShowingSequence] = useState<boolean>(true);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Generate sequence
    const seq: number[] = [];
    for (let i = 0; i < targetLength; i++) {
      seq.push(Math.floor(Math.random() * 4));
    }
    setSequence(seq);
    playSequence(seq);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [difficulty]);

  const playSequence = (seq: number[]) => {
    setIsShowingSequence(true);
    setPlayerInput([]);

    seq.forEach((colorId, index) => {
      timerRef.current = setTimeout(() => {
        setActiveButton(colorId);
        playClickSound();
        setTimeout(() => {
          setActiveButton(null);
          if (index === seq.length - 1) {
            setIsShowingSequence(false);
          }
        }, 500);
      }, (index + 1) * 800);
    });
  };

  const handleColorClick = (colorId: number) => {
    if (isShowingSequence) return;

    playClickSound();
    setActiveButton(colorId);
    setTimeout(() => setActiveButton(null), 200);

    const currentStep = playerInput.length;
    const expected = sequence[currentStep];

    if (colorId === expected) {
      const newInput = [...playerInput, colorId];
      setPlayerInput(newInput);

      if (newInput.length === sequence.length) {
        // Successfully reproduced sequence!
        playSuccessSound();
        const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const accuracy = Math.round((targetLength / (targetLength + mistakes)) * 100);
        const score = Math.max(70, Math.round(100 - mistakes * 10));
        setTimeout(() => {
          onComplete({ score, mistakes, accuracy, timeSpent });
        }, 600);
      }
    } else {
      // Mistake!
      playMistakeSound();
      setMistakes((prev) => prev + 1);
      // Re-show sequence
      setTimeout(() => {
        playSequence(sequence);
      }, 900);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-6 px-2 text-slate-700">
        <span className="text-lg font-medium">Steps: <strong>{playerInput.length} / {targetLength}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="mb-6 py-2 px-4 rounded-xl bg-slate-100 text-slate-800 font-semibold text-center">
        {isShowingSequence ? "👀 Watch the flashing sequence carefully..." : "👉 Now tap the colors in the exact same order!"}
      </div>

      <div className="grid grid-cols-2 gap-4 w-64 sm:w-72 h-64 sm:h-72">
        {COLORS.map((col) => (
          <button
            key={col.id}
            id={`seq-memory-btn-${col.id}`}
            onClick={() => handleColorClick(col.id)}
            disabled={isShowingSequence}
            className={`w-full h-full rounded-3xl transition-all duration-200 border-4 border-white shadow-md ${
              col.bg
            } ${activeButton === col.id ? col.activeBg : "opacity-90 hover:opacity-100 cursor-pointer"}`}
            aria-label={col.label}
          />
        ))}
      </div>

      <button
        onClick={() => playSequence(sequence)}
        disabled={isShowingSequence}
        className="mt-6 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer text-base"
      >
        🔄 Repeat Sequence
      </button>
    </div>
  );
};
