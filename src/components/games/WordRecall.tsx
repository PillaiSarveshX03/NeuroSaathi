import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

const WORD_BANK = [
  "Garden", "Sunshine", "River", "Breeze", "Flower",
  "Tea", "Smile", "Friend", "Morning", "Window",
  "Silver", "Ocean", "Music", "Tree", "Bird",
];

export const WordRecall: React.FC<Props> = ({ difficulty, onComplete }) => {
  const wordCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const [phase, setPhase] = useState<"memorize" | "recall">("memorize");
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [options, setOptions] = useState<{ word: string; isTarget: boolean; isSelected: boolean }[]>([]);
  const [countdown, setCountdown] = useState<number>(difficulty === "easy" ? 6 : 5);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    // Pick random target words
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, wordCount);
    setTargetWords(chosen);

    // Pick distractors
    const distractors = shuffled.slice(wordCount, wordCount + 4);
    const allOptions = [...chosen.map((w) => ({ word: w, isTarget: true, isSelected: false })),
      ...distractors.map((w) => ({ word: w, isTarget: false, isSelected: false }))
    ].sort(() => Math.random() - 0.5);

    setOptions(allOptions);

    // Countdown timer for memorize phase
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase("recall");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [difficulty]);

  const handleSelectWord = (index: number) => {
    const item = options[index];
    if (item.isSelected) return;

    playClickSound();

    if (item.isTarget) {
      playSuccessSound();
      const updated = options.map((opt, i) => (i === index ? { ...opt, isSelected: true } : opt));
      setOptions(updated);
      const newSelected = [...selectedWords, item.word];
      setSelectedWords(newSelected);

      if (newSelected.length === wordCount) {
        const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const accuracy = Math.round((wordCount / (wordCount + mistakes)) * 100);
        const score = Math.max(70, Math.round(100 - mistakes * 8));
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
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {phase === "memorize" ? (
        <div className="flex flex-col items-center text-center p-6 bg-blue-50/70 rounded-3xl border border-blue-200 w-full">
          <span className="text-sm uppercase tracking-wider text-blue-800 font-semibold mb-2">Memory Phase</span>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Remember these words:</h3>
          <p className="text-slate-600 mb-6">They will disappear in <strong className="text-blue-700 text-xl">{countdown}s</strong></p>

          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {targetWords.map((word, i) => (
              <span
                key={i}
                className="px-5 py-3 rounded-2xl bg-white border-2 border-blue-300 text-blue-950 font-bold text-2xl shadow-sm"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
            <span className="text-lg font-medium">Found: <strong className="text-emerald-700">{selectedWords.length} / {wordCount}</strong></span>
            <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
          </div>

          <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-6 text-center">
            Tap the words you remember seeing:
          </h3>

          <div className="grid grid-cols-2 gap-3 w-full">
            {options.map((item, idx) => (
              <button
                key={idx}
                id={`word-recall-opt-${idx}`}
                onClick={() => handleSelectWord(idx)}
                disabled={item.isSelected}
                className={`py-4 px-4 rounded-2xl border-2 font-bold text-xl transition-all cursor-pointer ${
                  item.isSelected
                    ? "bg-emerald-100 border-emerald-500 text-emerald-900 cursor-default opacity-80"
                    : "bg-white hover:bg-blue-50 text-slate-800 border-slate-300 hover:border-blue-500 shadow-sm"
                }`}
              >
                {item.word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
