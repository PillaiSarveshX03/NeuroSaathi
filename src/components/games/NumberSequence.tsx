import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

interface Question {
  sequence: (number | string)[];
  missingIndex: number;
  correctAnswer: number;
  options: number[];
  explanation: string;
}

export const NumberSequence: React.FC<Props> = ({ difficulty, onComplete }) => {
  const totalRounds = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const [currentRound, setCurrentRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    // Generate sequence problems based on difficulty
    const qList: Question[] = [];
    
    // Easy: +1, +2, +5 patterns
    // Medium: +3, +4, +10, -2 patterns
    // Hard: +7, *2, fibonacci or alternating
    for (let r = 0; r < totalRounds; r++) {
      let start = 2 + Math.floor(Math.random() * 10);
      let step = difficulty === "easy" ? (r % 2 === 0 ? 2 : 5) : difficulty === "medium" ? 3 + r : 4 + r * 2;
      
      const seq: number[] = [];
      for (let i = 0; i < 5; i++) {
        seq.push(start + i * step);
      }

      const missingIndex = 3; // 4th item missing
      const correctAnswer = seq[missingIndex];
      const displaySeq: (number | string)[] = [...seq];
      displaySeq[missingIndex] = "?";

      // Options
      const options = [
        correctAnswer,
        correctAnswer + step,
        correctAnswer - (step > 1 ? step - 1 : 2),
        correctAnswer + 3,
      ].sort(() => Math.random() - 0.5);

      qList.push({
        sequence: displaySeq,
        missingIndex,
        correctAnswer,
        options: Array.from(new Set(options)).slice(0, 4),
        explanation: `Each number increases by ${step}.`,
      });
    }

    setQuestions(qList);
  }, [difficulty]);

  const currentQ = questions[currentRound];

  const handleAnswer = (val: number) => {
    if (!currentQ) return;
    playClickSound();
    setSelectedOption(val);

    if (val === currentQ.correctAnswer) {
      playSuccessSound();
      setTimeout(() => {
        setSelectedOption(null);
        if (currentRound + 1 >= totalRounds) {
          const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
          const accuracy = Math.round((totalRounds / (totalRounds + mistakes)) * 100);
          const score = Math.max(65, Math.round(100 - mistakes * 8));
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
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center mb-6 px-2 text-slate-700">
        <span className="text-lg font-medium">Round: <strong>{currentRound + 1} / {totalRounds}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className="text-xl sm:text-2xl font-semibold text-slate-800 mb-6 text-center">
        What number comes next in the pattern?
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8">
        {currentQ.sequence.map((item, idx) => (
          <div
            key={idx}
            className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl border-2 text-2xl sm:text-3xl font-bold shadow-sm ${
              item === "?"
                ? "bg-amber-100 border-amber-400 text-amber-900 ring-4 ring-amber-200 animate-pulse"
                : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            id={`number-seq-opt-${opt}`}
            onClick={() => handleAnswer(opt)}
            className={`py-4 px-6 rounded-2xl text-2xl font-bold border-2 transition-all cursor-pointer ${
              selectedOption === opt
                ? opt === currentQ.correctAnswer
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                  : "bg-rose-500 text-white border-rose-500 animate-shake"
                : "bg-white hover:bg-blue-50 text-slate-800 border-slate-300 hover:border-blue-500 shadow-sm"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
