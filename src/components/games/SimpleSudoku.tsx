import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

// Pre-solved 4x4 valid Sudoku template
const BASE_SOLUTIONS = [
  [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ],
  [
    [4, 1, 2, 3],
    [2, 3, 4, 1],
    [1, 4, 3, 2],
    [3, 2, 1, 4],
  ],
];

export const SimpleSudoku: React.FC<Props> = ({ difficulty, onComplete }) => {
  const [solution, setSolution] = useState<number[][]>([]);
  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [initialMask, setInitialMask] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    const sol = BASE_SOLUTIONS[Math.floor(Math.random() * BASE_SOLUTIONS.length)];
    setSolution(sol);

    const missingCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 4 : 6;
    
    // Choose missing cells
    const mask = [
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
    ];

    let removed = 0;
    while (removed < missingCount) {
      const r = Math.floor(Math.random() * 4);
      const c = Math.floor(Math.random() * 4);
      if (!mask[r][c]) {
        mask[r][c] = true;
        removed++;
      }
    }

    setInitialMask(mask);

    const initialGrid = sol.map((row, r) =>
      row.map((val, c) => (mask[r][c] ? null : val))
    );
    setGrid(initialGrid);

    // Auto-select first empty cell
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (mask[r][c]) {
          setSelectedCell([r, c]);
          return;
        }
      }
    }
  }, [difficulty]);

  const handleSelectCell = (r: number, c: number) => {
    if (initialMask[r]?.[c]) {
      playClickSound();
      setSelectedCell([r, c]);
    }
  };

  const handleInputNumber = (num: number) => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;

    playClickSound();

    if (solution[r][c] === num) {
      // Correct entry!
      playSuccessSound();
      const nextGrid = grid.map((row, rowIdx) =>
        row.map((cell, colIdx) => (rowIdx === r && colIdx === c ? num : cell))
      );
      setGrid(nextGrid);

      // Check if complete
      let isAllFilled = true;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (nextGrid[i][j] !== solution[i][j]) {
            isAllFilled = false;
            break;
          }
        }
      }

      if (isAllFilled) {
        const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const accuracy = Math.round((100 / (100 + mistakes * 15)) * 100);
        const score = Math.max(70, Math.round(100 - mistakes * 5 - Math.floor(timeSpent / 8)));
        setTimeout(() => {
          onComplete({ score, mistakes, accuracy, timeSpent });
        }, 500);
      } else {
        // Find next empty cell
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            if (initialMask[i][j] && nextGrid[i][j] === null) {
              setSelectedCell([i, j]);
              return;
            }
          }
        }
      }
    } else {
      // Incorrect entry!
      playMistakeSound();
      setMistakes((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
        <span className="text-lg font-medium">Simple 4×4 Sudoku</span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <p className="text-sm sm:text-base text-slate-600 mb-4 text-center">
        Each row, column, and 2×2 box must contain numbers 1, 2, 3, and 4 without repeating.
      </p>

      {/* Sudoku 4x4 Grid */}
      <div className="grid grid-cols-4 gap-1.5 p-3 bg-slate-800 rounded-2xl shadow-md mb-6">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const isEditable = initialMask[r]?.[c];
            const borderRight = c === 1 ? "mr-1 border-r-4 border-slate-700" : "";
            const borderBottom = r === 1 ? "mb-1 border-b-4 border-slate-700" : "";

            return (
              <button
                key={`${r}-${c}`}
                id={`sudoku-cell-${r}-${c}`}
                onClick={() => handleSelectCell(r, c)}
                disabled={!isEditable}
                className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl text-2xl sm:text-3xl font-bold transition-all ${borderRight} ${borderBottom} ${
                  isSelected
                    ? "bg-amber-300 text-slate-900 ring-4 ring-amber-400 scale-105"
                    : isEditable
                    ? cell !== null
                      ? "bg-blue-100 text-blue-900 border-2 border-blue-400"
                      : "bg-white text-slate-400 hover:bg-amber-50 cursor-pointer"
                    : "bg-slate-100 text-slate-800 font-extrabold cursor-default"
                }`}
              >
                {cell !== null ? cell : "?"}
              </button>
            );
          })
        )}
      </div>

      {/* Number Selection Keypad */}
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4].map((num) => (
          <button
            key={num}
            id={`sudoku-key-${num}`}
            onClick={() => handleInputNumber(num)}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-2xl shadow-sm transition-all cursor-pointer"
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
