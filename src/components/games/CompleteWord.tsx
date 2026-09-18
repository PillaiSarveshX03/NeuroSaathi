import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

const WORDS_DATABASE = [
  { full: "SMILE", display: "S M _ L E", missing: "I", hint: "A happy expression on your face 😊" },
  { full: "HEART", display: "H _ A R T", missing: "E", hint: "Pumps blood through your body ❤️" },
  { full: "PEACE", display: "P _ A C E", missing: "E", hint: "Quiet, calm and harmony 🕊️" },
  { full: "WATER", display: "W A _ E R", missing: "T", hint: "Essential clear liquid we drink 💧" },
  { full: "FLOWER", display: "F L O _ E R", missing: "W", hint: "Blooms beautifully in a garden 🌸" },
  { full: "FRIEND", display: "F R _ E N D", missing: "I", hint: "Someone caring who spends time with you 🤝" },
  { full: "SUNSHINE", display: "S U N S H _ N E", missing: "I", hint: "Warm light from the sun ☀️" },
];

export const CompleteWord: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalRounds = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const [currentRound, setCurrentRound] = useState(0);
  const [questions, setQuestions] = useState<typeof WORDS_DATABASE>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const shuffled = [...WORDS_DATABASE].sort(() => Math.random() - 0.5).slice(0, totalRounds);
    setQuestions(shuffled);
  }, [difficulty]);

  useEffect(() => {
    if (questions[currentRound]) {
      const correct = questions[currentRound].missing;
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((l) => l !== correct);
      const randoms = alphabet.sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([correct, ...randoms].sort(() => Math.random() - 0.5));
    }
  }, [currentRound, questions]);

  const currentQ = questions[currentRound];

  const handlePickLetter = (letter: string) => {
    if (!currentQ) return;
    playClickSound();

    if (letter === currentQ.missing) {
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

  if (!currentQ) return null;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-6 px-2 text-slate-700">
        <span className="text-lg font-medium">Word: <strong>{currentRound + 1} / {totalRounds}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl w-full text-center mb-6 shadow-xs">
        <span className="text-4xl sm:text-5xl font-black tracking-widest text-blue-900 font-mono">
          {currentQ.display}
        </span>
        <p className="mt-4 text-base text-slate-600 font-medium">
          Hint: {currentQ.hint}
        </p>
      </div>

      <h4 className="text-lg font-semibold text-slate-700 mb-4">Choose the missing letter:</h4>

      <div className="grid grid-cols-4 gap-3 w-full">
        {options.map((letter, i) => (
          <button
            key={i}
            id={`complete-word-letter-${letter}`}
            onClick={() => handlePickLetter(letter)}
            className="h-16 sm:h-20 rounded-2xl bg-white hover:bg-blue-50 border-2 border-slate-300 hover:border-blue-500 text-3xl font-extrabold text-slate-800 shadow-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
};
