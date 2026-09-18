import React from "react";
import { UserProfile } from "../types";
import { getTranslation } from "../lib/languages";
import { playClickSound } from "../lib/audio";
import { LanguageSelector } from "./LanguageSelector";
import { HeartPulse, ShieldAlert, Mic } from "lucide-react";

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserProfile;
  selectedLanguage: string;
  onLanguageChange: (langName: string) => void;
  onOpenSosModal: () => void;
  onOpenVoiceModal: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  currentUser,
  selectedLanguage,
  onLanguageChange,
  onOpenSosModal,
  onOpenVoiceModal,
}) => {
  const t = (key: string) => getTranslation(selectedLanguage, key);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div
            onClick={() => {
              playClickSound();
              onSelectTab("home");
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#074738] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform border border-[#043328]">
              <HeartPulse className="w-7 h-7 text-[#a7f0df]" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                Neuro<span className="text-[#0d6e5a]">Sathi</span>
              </span>
              <span className="text-xs font-bold text-slate-600 block -mt-0.5 tracking-wide">
                {t("tagline") || "Your Companion, At Every Step"}
              </span>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 46 Languages Searchable Selector */}
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={onLanguageChange}
            />

            {/* Voice Mode Icon Button */}
            <button
              id="navbar-voice-mode-btn"
              onClick={() => {
                playClickSound();
                onOpenVoiceModal();
              }}
              title="Open Voice Companion"
              className="w-11 h-11 rounded-2xl bg-[#e8fbf6] hover:bg-[#d1f7ee] border-2 border-[#a7f0df] text-[#074738] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
            >
              <Mic className="w-5 h-5 text-[#0d6e5a]" />
            </button>

            {/* Emergency SOS Button */}
            <button
              id="navbar-emergency-sos-btn"
              onClick={() => {
                playClickSound();
                onOpenSosModal();
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-sm sm:text-base flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 border border-red-700"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
