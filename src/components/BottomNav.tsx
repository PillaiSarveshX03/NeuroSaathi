import React from "react";
import { UserProfile } from "../types";
import { getTranslation } from "../lib/languages";
import { playClickSound } from "../lib/audio";
import {
  HeartPulse,
  Brain,
  Mic,
  TrendingUp,
  Stethoscope,
  Clock,
  User,
} from "lucide-react";

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserProfile;
  selectedLanguage: string;
  onOpenVoiceModal: () => void;
  onOpenRemindersModal: () => void;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  currentUser,
  selectedLanguage,
  onOpenVoiceModal,
  onOpenRemindersModal,
}) => {
  const t = (key: string) => getTranslation(selectedLanguage, key);

  const navItems = [
    {
      id: "home",
      label: t("home") || "Home",
      icon: HeartPulse,
      action: () => {
        playClickSound();
        onSelectTab("home");
      },
      isActive: activeTab === "home",
    },
    {
      id: "games",
      label: "Brain Games",
      icon: Brain,
      action: () => {
        playClickSound();
        onSelectTab("games");
      },
      isActive: activeTab === "games",
    },
    {
      id: "voice",
      label: "Voice Chat",
      icon: Mic,
      action: () => {
        playClickSound();
        onOpenVoiceModal();
      },
      isActive: false,
      isSpecial: true,
    },
    {
      id: "report",
      label: "Progress / Report",
      icon: TrendingUp,
      action: () => {
        playClickSound();
        onSelectTab("report");
      },
      isActive: activeTab === "report",
    },
    {
      id: "doctor",
      label: currentUser.role === "doctor" ? "Doctor Portal" : "Doctor",
      icon: Stethoscope,
      action: () => {
        playClickSound();
        onSelectTab("doctor");
      },
      isActive: activeTab === "doctor",
    },
    {
      id: "reminders",
      label: "Reminders",
      icon: Clock,
      action: () => {
        playClickSound();
        onOpenRemindersModal();
      },
      isActive: false,
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      action: () => {
        playClickSound();
        onSelectTab("profile");
      },
      isActive: activeTab === "profile",
    },
  ];

  return (
    <nav
      id="main-bottom-navigation"
      aria-label="Main Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-slate-300/90 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] py-1.5 sm:py-2"
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}`}
                onClick={item.action}
                className={`group flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer min-h-[52px] sm:min-h-[56px] active:scale-95 ${
                  isActive
                    ? "bg-[#074738] text-white shadow-sm ring-1 ring-[#043328]"
                    : item.isSpecial
                    ? "text-[#0d6e5a] hover:bg-[#e8fbf6] font-bold"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-bold"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${
                      isActive ? "text-white" : item.isSpecial ? "text-[#0d6e5a]" : "text-slate-700"
                    }`}
                  />
                  {item.isSpecial && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-black tracking-tight mt-1 text-center truncate max-w-full ${
                    isActive ? "text-white" : "text-slate-700 group-hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
