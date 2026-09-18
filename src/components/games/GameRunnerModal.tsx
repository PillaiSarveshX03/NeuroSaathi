import React, { useState } from "react";
import confetti from "canvas-confetti";
import { ALL_COGNITIVE_GAMES, GameMeta } from "./gamesRegistry";
import { GameDifficulty, UserProfile } from "../../types";
import { neurosathiDb } from "../../lib/supabase";
import { playClickSound, playSuccessSound } from "../../lib/audio";

// Game components
import { CardMatching } from "./CardMatching";
import { SequenceMemory } from "./SequenceMemory";
import { NumberSequence } from "./NumberSequence";
import { SimpleSudoku } from "./SimpleSudoku";
import { PatternCompletion } from "./PatternCompletion";
import { OddOneOut } from "./OddOneOut";
import { FindObject } from "./FindObject";
import { TargetSearch } from "./TargetSearch";
import { WordRecall } from "./WordRecall";
import { CompleteWord } from "./CompleteWord";
import { PictureMemory } from "./PictureMemory";
import { WhatMissing } from "./WhatMissing";
import { TapTarget } from "./TapTarget";
import { QuickResponse } from "./QuickResponse";

interface Props {
  gameId: string;
  currentUser: UserProfile;
  initialDifficulty?: GameDifficulty;
  onClose: () => void;
  onResultSaved?: () => void;
}

export const GameRunnerModal: React.FC<Props> = ({
  gameId,
  currentUser,
  initialDifficulty = "easy",
  onClose,
  onResultSaved,
}) => {
  const meta: GameMeta =
    ALL_COGNITIVE_GAMES.find((g) => g.id === gameId) || ALL_COGNITIVE_GAMES[0];

  const [difficulty, setDifficulty] = useState<GameDifficulty>(initialDifficulty);
  const [completedStats, setCompletedStats] = useState<{
    score: number;
    mistakes: number;
    accuracy: number;
    timeSpent: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const handleGameComplete = async (stats: {
    score: number;
    mistakes: number;
    accuracy: number;
    timeSpent: number;
  }) => {
    setCompletedStats(stats);
    setSaveError(null);
    playSuccessSound();

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }

    setIsSaving(true);
    try {
      await neurosathiDb.saveGameResult({
        userId: currentUser.id,
        gameId: meta.id,
        gameName: meta.name,
        category: meta.category,
        score: stats.score,
        mistakes: stats.mistakes,
        accuracy: stats.accuracy,
        difficulty,
        timeSpentSeconds: stats.timeSpent,
      });
      if (onResultSaved) {
        onResultSaved();
      }
    } catch (err: any) {
      console.error("Failed to save game result", err);
      setSaveError(err.message || "Failed to save game result to secure cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = () => {
    playClickSound();
    setCompletedStats(null);
    setGameKey((prev) => prev + 1);
  };

  const renderGame = () => {
    const currentKey = `${meta.id}-${difficulty}-${gameKey}`;
    const gameProps = {
      difficulty,
      onComplete: handleGameComplete,
    };

    switch (meta.id) {
      case "card-matching":
        return <CardMatching key={currentKey} {...gameProps} />;
      case "sequence-memory":
        return <SequenceMemory key={currentKey} {...gameProps} />;
      case "number-sequence":
        return <NumberSequence key={currentKey} {...gameProps} />;
      case "simple-sudoku":
        return <SimpleSudoku key={currentKey} {...gameProps} />;
      case "pattern-completion":
        return <PatternCompletion key={currentKey} {...gameProps} />;
      case "odd-one-out":
        return <OddOneOut key={currentKey} {...gameProps} />;
      case "find-object":
        return <FindObject key={currentKey} {...gameProps} />;
      case "target-search":
        return <TargetSearch key={currentKey} {...gameProps} />;
      case "word-recall":
        return <WordRecall key={currentKey} {...gameProps} />;
      case "complete-word":
        return <CompleteWord key={currentKey} {...gameProps} />;
      case "picture-memory":
        return <PictureMemory key={currentKey} {...gameProps} />;
      case "what-missing":
        return <WhatMissing key={currentKey} {...gameProps} />;
      case "tap-target":
        return <TapTarget key={currentKey} {...gameProps} />;
      case "quick-response":
        return <QuickResponse key={currentKey} {...gameProps} />;
      default:
        return <CardMatching key={currentKey} {...gameProps} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-5 sm:p-8 shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl p-2 bg-blue-50 rounded-2xl border border-blue-100">{meta.icon}</span>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{meta.name}</h2>
              <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {meta.category}
              </span>
            </div>
          </div>
          <button
            id="close-game-modal-btn"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-2xl font-bold transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Difficulty Selector (if not completed) */}
        {!completedStats && (
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 mb-6">
            <span className="text-sm font-bold text-slate-700 pl-2">Difficulty:</span>
            <div className="flex gap-1.5">
              {(["easy", "medium", "hard"] as GameDifficulty[]).map((level) => (
                <button
                  key={level}
                  id={`difficulty-${level}-btn`}
                  onClick={() => {
                    playClickSound();
                    setDifficulty(level);
                    setGameKey((k) => k + 1);
                  }}
                  className={`px-4 py-1.5 rounded-xl font-bold text-sm uppercase transition-all cursor-pointer ${
                    difficulty === level
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Stage or Completed Result */}
        {completedStats ? (
          <div className="flex flex-col items-center text-center py-6 px-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mb-4 border-2 border-emerald-300">
              🌟
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Well Done, {currentUser.fullName}!</h3>
            <p className="text-slate-600 mb-8 max-w-md">
              You exercised your brain and completed <strong>{meta.name}</strong> on <strong>{difficulty}</strong> mode.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-8">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <span className="text-xs uppercase font-bold text-blue-700">Score</span>
                <div className="text-3xl font-black text-blue-900 mt-1">{completedStats.score}</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-xs uppercase font-bold text-emerald-700">Accuracy</span>
                <div className="text-3xl font-black text-emerald-900 mt-1">{completedStats.accuracy}%</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-xs uppercase font-bold text-amber-700">Mistakes</span>
                <div className="text-3xl font-black text-amber-900 mt-1">{completedStats.mistakes}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <span className="text-xs uppercase font-bold text-purple-700">Time</span>
                <div className="text-3xl font-black text-purple-900 mt-1">{completedStats.timeSpent}s</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 w-full">
              <button
                id="play-again-btn"
                onClick={handleRestart}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer text-lg"
              >
                🔄 Play Again
              </button>
              <button
                id="finish-game-btn"
                onClick={onClose}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl transition-all cursor-pointer text-lg"
              >
                ✅ Return to Games
              </button>
            </div>

            <div className="mt-6 text-xs font-medium">
              {saveError ? (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold max-w-md mx-auto">
                  ⚠️ Cloud Save Error: {saveError}
                </div>
              ) : isSaving ? (
                <span className="text-blue-600 font-semibold">Saving progress to secure cloud...</span>
              ) : (
                <span className="text-emerald-600 font-semibold">✓ Saved directly to cognitive history!</span>
              )}
            </div>
          </div>
        ) : (
          renderGame()
        )}
      </div>
    </div>
  );
};
