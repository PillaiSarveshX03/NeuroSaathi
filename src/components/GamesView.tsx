import React, { useState } from "react";
import { ALL_COGNITIVE_GAMES } from "./games/gamesRegistry";
import { UserProfile } from "../types";
import { playClickSound } from "../lib/audio";
import { getTranslation } from "../lib/languages";
import { Sparkles, Brain, Clock, ShieldCheck, Gamepad2 } from "lucide-react";

interface Props {
  currentUser: UserProfile;
  selectedLanguage?: string;
  onLaunchGame: (gameId: string) => void;
}

export const GamesView: React.FC<Props> = ({
  currentUser,
  selectedLanguage = "en",
  onLaunchGame,
}) => {
  const t = (key: string) => getTranslation(selectedLanguage, key);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    { id: "All", label: t("allCategories") || "All Games" },
    { id: "Memory", label: t("memory") || "Memory" },
    { id: "Attention", label: t("attention") || "Attention" },
    { id: "Problem Solving", label: t("problemSolving") || "Problem Solving" },
    { id: "Language", label: t("languageCat") || "Language" },
    { id: "Motor & Speed", label: t("motorSpeed") || "Speed & Motor" },
  ];

  const filteredGames =
    selectedCategory === "All"
      ? ALL_COGNITIVE_GAMES
      : ALL_COGNITIVE_GAMES.filter((g) => g.category === selectedCategory);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
      {/* Title & Introduction Banner (Matches Homepage dignified banner architecture) */}
      <div className="bg-[#074738] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#043328] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-black text-sm sm:text-base tracking-wide">
            <Brain className="w-5 h-5 text-amber-300" />
            <span>{t("cognitiveGym") || "DAILY BRAIN EXERCISES"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {t("brainFitnessGames") || "Brain Fitness Games"}
          </h1>
          <p className="text-emerald-100 text-base sm:text-lg max-w-2xl font-medium leading-relaxed">
            {t("gamesHeroDesc") || "Clinically designed puzzles to stimulate focus, working memory, and mental agility."}
          </p>
        </div>

        <div className="bg-[#043328]/80 border-2 border-amber-400/30 px-5 py-3.5 rounded-2xl text-center sm:text-right shrink-0">
          <span className="text-xs uppercase font-black text-amber-300 block tracking-wider">
            {t("activeUser") || "Active Player"}
          </span>
          <span className="text-lg sm:text-xl font-black text-white block mt-0.5">
            {currentUser.fullName}
          </span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`category-tab-${cat.id.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => {
                playClickSound();
                setSelectedCategory(cat.id);
              }}
              className={`px-5 py-3 rounded-2xl font-black text-sm sm:text-base whitespace-nowrap transition-all cursor-pointer min-h-[48px] active:scale-95 ${
                isSelected
                  ? "bg-[#d97706] text-white shadow-md border-2 border-[#b45309]"
                  : "bg-white text-slate-800 hover:bg-slate-100 border-2 border-slate-300 font-bold"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Games Grid (2-3 columns with strong borders and high contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="bg-white rounded-3xl border-2 border-slate-300 hover:border-amber-500 p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:shadow-lg group shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#fffbf0] border-2 border-[#fed7aa] flex items-center justify-center text-4xl shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  {game.icon}
                </div>
                <span className="text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                  {game.category}
                </span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                {game.name}
              </h3>
              <p className="mt-2.5 text-slate-700 text-base font-semibold leading-relaxed">
                {game.description}
              </p>

              <div className="mt-4 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs sm:text-sm text-amber-950 font-bold flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{game.benefits}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> 2-4 mins
              </span>
              <button
                id={`launch-game-${game.id}`}
                onClick={() => {
                  playClickSound();
                  onLaunchGame(game.id);
                }}
                className="px-6 py-3 rounded-2xl bg-[#d97706] hover:bg-[#b45309] active:scale-95 text-white font-black text-base shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{t("playGame") || "Play Now"}</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
