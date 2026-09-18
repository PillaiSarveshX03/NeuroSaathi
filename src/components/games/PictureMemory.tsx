import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

const PICTURES_POOL = [
  { emoji: "🌻", name: "Sunflower" },
  { emoji: "🐘", name: "Elephant" },
  { emoji: "🍎", name: "Apple" },
  { emoji: "⛵", name: "Sailboat" },
  { emoji: "🏡", name: "House" },
  { emoji: "🕊️", name: "Dove" },
  { emoji: "🍉", name: "Watermelon" },
  { emoji: "🔔", name: "Bell" },
  { emoji: "🎸", name: "Guitar" },
  { emoji: "🐱", name: "Cat" },
];

export const PictureMemory: React.FC<Props> = ({ difficulty, onComplete }) => {
  const showCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  const totalQuestions = 3;

  const [phase, setPhase] = useState<"memorize" | "questions">("memorize");
  const [countdown, setCountdown] = useState<number>(difficulty === "easy" ? 7 : 6);
  const [memorizedItems, setMemorizedItems] = useState<{ emoji: string; name: string }[]>([]);
  const [questions, setQuestions] = useState<{ item: { emoji: string; name: string }; wasPresent: boolean }[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    const shuffled = [...PICTURES_POOL].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, showCount);
    const unused = shuffled.slice(showCount);
    setMemorizedItems(chosen);

    // Create 3 questions (mix of yes/no)
    const qList = [
      { item: chosen[0], wasPresent: true },
      { item: unused[0], wasPresent: false },
      { item: chosen[1] || chosen[0], wasPresent: true },
    ].sort(() => Math.random() - 0.5);
    setQuestions(qList);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase("questions");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [difficulty]);

  const handleAnswer = (answerYes: boolean) => {
    const currentQ = questions[qIndex];
    if (!currentQ) return;
    playClickSound();

    if (answerYes === currentQ.wasPresent) {
      playSuccessSound();
      setTimeout(() => {
        if (qIndex + 1 >= totalQuestions) {
          const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
          const accuracy = Math.round((totalQuestions / (totalQuestions + mistakes)) * 100);
          const score = Math.max(70, Math.round(100 - mistakes * 9));
          onComplete({ score, mistakes, accuracy, timeSpent });
        } else {
          setQIndex((prev) => prev + 1);
        }
      }, 500);
    } else {
      playMistakeSound();
      setMistakes((prev) => prev + 1);
    }
  };

  const currentQ = questions[qIndex];

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {phase === "memorize" ? (
        <div className="flex flex-col items-center text-center p-6 bg-emerald-50/80 rounded-3xl border border-emerald-200 w-full">
          <span className="text-sm uppercase tracking-wider text-emerald-800 font-semibold mb-1">Observation Phase</span>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Look at these pictures carefully:</h3>
          <p className="text-slate-600 mb-6">Time left: <strong className="text-emerald-700 text-xl">{countdown}s</strong></p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
            {memorizedItems.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white border-2 border-emerald-200 flex flex-col items-center justify-center shadow-xs"
              >
                <span className="text-5xl mb-1">{item.emoji}</span>
                <span className="text-base font-semibold text-slate-700">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6 px-2 text-slate-700">
            <span className="text-lg font-medium">Question: <strong>{qIndex + 1} / {totalQuestions}</strong></span>
            <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
          </div>

          <div className="p-6 bg-white border-2 border-slate-200 rounded-3xl w-full text-center mb-8 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-800 mb-4">Was this picture in the group?</h3>
            <div className="text-6xl mb-2">{currentQ?.item.emoji}</div>
            <div className="text-2xl font-bold text-slate-800">{currentQ?.item.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              id="picture-memory-yes"
              onClick={() => handleAnswer(true)}
              className="py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-2xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✅ YES</span>
            </button>
            <button
              id="picture-memory-no"
              onClick={() => handleAnswer(false)}
              className="py-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-2xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <span>❌ NO</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
