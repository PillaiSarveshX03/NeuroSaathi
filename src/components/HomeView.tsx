import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, UserProgress, DailyReminder } from "../types";
import { neurosathiDb } from "../lib/supabase";
import { playClickSound, playSuccessSound } from "../lib/audio";
import {
  speakSpeech,
  stopAnySpeech,
  getStoredVoiceName,
  getStoredVoiceEngine,
} from "../lib/voiceService";
import { getTranslation } from "../lib/languages";
import {
  Brain,
  MessageSquare,
  Stethoscope,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Mic,
  ChevronRight,
  Plus,
  AlertCircle,
  User,
  TrendingUp,
  X,
  Heart,
  Bot,
  Volume2,
  Sun,
  AlertOctagon,
} from "lucide-react";

interface Props {
  currentUser: UserProfile;
  selectedLanguage: string;
  onNavigate: (tab: string) => void;
  onLaunchGame: (gameId: string) => void;
  onOpenVoiceModal: () => void;
  onOpenSosModal: () => void;
  onOpenRemindersModal?: () => void;
}

export const HomeView: React.FC<Props> = ({
  currentUser,
  selectedLanguage,
  onNavigate,
  onLaunchGame,
  onOpenVoiceModal,
  onOpenSosModal,
  onOpenRemindersModal,
}) => {
  const t = (key: string) => getTranslation(selectedLanguage, key);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [reminders, setReminders] = useState<DailyReminder[]>([]);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("10:00 AM");
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadHomeData();
    return () => {
      stopAnySpeech();
    };
  }, [currentUser.id]);

  const loadHomeData = async () => {
    try {
      const [prog, rems] = await Promise.all([
        neurosathiDb.getProgress(currentUser.id),
        neurosathiDb.getReminders(currentUser.id),
      ]);
      setProgress(prog);
      setReminders(rems);
    } catch (err: any) {
      console.error("Failed to load home data from Supabase:", err);
      setActionError(`Could not load data from secure cloud: ${err.message || String(err)}`);
    }
  };

  const handleToggleReminder = async (rem: DailyReminder) => {
    playClickSound();
    setActionError(null);
    try {
      await neurosathiDb.toggleReminder(rem.id, !rem.isCompleted);
      setReminders((prev) =>
        prev.map((r) => (r.id === rem.id ? { ...r, isCompleted: !r.isCompleted } : r))
      );
      if (!rem.isCompleted) {
        playSuccessSound();
      }
    } catch (err: any) {
      console.error("Failed to toggle reminder in Supabase:", err);
      setActionError(`Failed to update reminder: ${err.message || "Please try again."}`);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    playClickSound();
    setActionError(null);

    try {
      const created = await neurosathiDb.addReminder({
        userId: currentUser.id,
        title: newReminderTitle.trim(),
        time: newReminderTime,
        timeOfDay: newReminderTime,
        isCompleted: false,
      });

      setReminders((prev) => [...prev, created]);
      setNewReminderTitle("");
      setShowAddReminder(false);
      playSuccessSound();
    } catch (err: any) {
      console.error("Failed to add reminder in Supabase:", err);
      setActionError(`Failed to add reminder: ${err.message || "Please try again."}`);
    }
  };

  const dueRemindersCount = useMemo(
    () => reminders.filter((r) => !r.isCompleted).length,
    [reminders]
  );

  const completedRemindersCount = useMemo(
    () => reminders.filter((r) => r.isCompleted).length,
    [reminders]
  );

  const nextPendingReminder = useMemo(
    () => reminders.find((r) => !r.isCompleted),
    [reminders]
  );

  const nextReminderSubtitle = useMemo(() => {
    if (nextPendingReminder) {
      return `Next: ${nextPendingReminder.title} (${nextPendingReminder.timeOfDay || nextPendingReminder.time || "13:00"})`;
    }
    if (reminders.length > 0) {
      return "All reminders completed today! Great job.";
    }
    return "Next: दोपहर की बीपी की दवाई (Telmisartan 40mg) (13:00)";
  }, [nextPendingReminder, reminders]);

  const greetingTimeText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const handleSpeakGreeting = () => {
    playClickSound();
    const greetingMsg = `${greetingTimeText}, ${currentUser.fullName}. What would you like to do today? Tap any feature card below.`;
    speakSpeech({
      text: greetingMsg,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 sm:space-y-7">
      {actionError && (
        <div
          id="home-action-error-banner"
          className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-amber-900 text-sm shadow-xs"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP GREETING BANNER (Matches Reference Screenshot 3) */}
      <section aria-label="Greeting Header">
        <div className="bg-[#074738] rounded-3xl p-6 sm:p-7 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm sm:text-base">
              <Sun className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{greetingTimeText}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentUser.fullName}
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base font-medium">
              What would you like to do today? Tap any feature card below.
            </p>
          </div>

          <button
            id="home-listen-greeting-btn"
            onClick={handleSpeakGreeting}
            title="Listen to greeting"
            className="self-start sm:self-auto inline-flex items-center gap-2 bg-[#043328]/80 hover:bg-[#043328] text-amber-200 border border-amber-400/40 px-5 py-2.5 rounded-full font-bold text-sm sm:text-base transition cursor-pointer shadow-xs active:scale-95"
          >
            <Volume2 className="w-5 h-5 text-amber-300 shrink-0" />
            <span>Listen</span>
          </button>
        </div>
      </section>

      {/* MAIN HOME AREA: 4-ROW TWO-COLUMN DASHBOARD (Matches Reference Screenshots) */}
      <section aria-label="Main Feature Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* ROW 1 - Card 1: AI Voice */}
          <div
            id="home-card-ai-voice"
            onClick={() => {
              playClickSound();
              onOpenVoiceModal();
            }}
            className="bg-[#e8fbf6] hover:bg-[#d9f7ef] border-2 border-[#a7f0df] hover:border-[#0d6e5a] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#0d6e5a] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <span className="bg-[#b2f5e5] text-[#0d6e5a] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <span>🎤</span>
                <span>Voice</span>
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-[#0d4a3e] tracking-tight group-hover:text-[#06332a] transition-colors">
                  AI Voice
                </h3>
                <ChevronRight className="w-6 h-6 text-[#0d6e5a] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[#134e48] text-sm sm:text-base font-semibold mt-1">
                Speak naturally • Friendly voice companion
              </p>
            </div>
          </div>

          {/* ROW 1 - Card 2: AI Chat */}
          <div
            id="home-card-ai-chat"
            onClick={() => {
              playClickSound();
              onNavigate("chat");
            }}
            className="bg-[#edf5ff] hover:bg-[#e0efff] border-2 border-[#b8d8ff] hover:border-[#2563eb] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <span className="bg-[#dbeafe] text-[#1e40af] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <span>💬</span>
                <span>Chat</span>
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-[#1e3a8a] tracking-tight group-hover:text-[#172554] transition-colors">
                  AI Chat
                </h3>
                <ChevronRight className="w-6 h-6 text-[#2563eb] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[#1e40af] text-sm sm:text-base font-semibold mt-1">
                Type messages & questions • Helpful AI advice
              </p>
            </div>
          </div>

          {/* ROW 2 - Card 1: Brain Games */}
          <div
            id="home-card-brain-games"
            onClick={() => {
              playClickSound();
              onNavigate("games");
            }}
            className="bg-[#fffbf0] hover:bg-[#fff6dc] border-2 border-[#fed7aa] hover:border-[#ea580c] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#ea580c] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <span className="bg-[#fef3c7] text-[#92400e] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full">
                Played: {progress?.totalGamesPlayed ?? 3}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-[#7c2d12] tracking-tight group-hover:text-[#581c0c] transition-colors">
                  Brain Games
                </h3>
                <ChevronRight className="w-6 h-6 text-[#ea580c] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[#9a3412] text-sm sm:text-base font-semibold mt-1">
                Memory, pattern & recall puzzles for mental agility
              </p>
            </div>
          </div>

          {/* ROW 2 - Card 2: Progress / Report */}
          <div
            id="home-card-progress-report"
            onClick={() => {
              playClickSound();
              onNavigate("report");
            }}
            className="bg-[#eefcfc] hover:bg-[#d9f8f8] border-2 border-[#99f6e4] hover:border-[#0d766e] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#0d766e] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <span className="bg-[#ccfbf1] text-[#115e59] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <span>📊</span>
                <span>Progress</span>
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-[#134e4a] tracking-tight group-hover:text-[#042f2e] transition-colors">
                  Progress / Report
                </h3>
                <ChevronRight className="w-6 h-6 text-[#0d766e] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[#115e59] text-sm sm:text-base font-semibold mt-1">
                Cognitive vitality score, game history & doctor trends
              </p>
            </div>
          </div>

          {/* ROW 3 - Card 1: Chat with Doctor */}
          <div
            id="home-card-chat-doctor"
            onClick={() => {
              playClickSound();
              onNavigate("doctor");
            }}
            className="bg-[#f0fdf9] hover:bg-[#e0fcf2] border-2 border-[#a7f3d0] hover:border-[#059669] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#059669] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <span className="bg-[#d1fae5] text-[#065f46] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <span>🩺</span>
                <span>Connect</span>
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-[#064e3b] tracking-tight group-hover:text-[#022c22] transition-colors">
                  Chat with Doctor
                </h3>
                <ChevronRight className="w-6 h-6 text-[#059669] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[#065f46] text-sm sm:text-base font-semibold mt-1">
                Connect with your doctor using key to send messages
              </p>
            </div>
          </div>

          {/* ROW 3 - Card 2: Reminders */}
          <div
            id="home-card-reminders"
            onClick={() => {
              playClickSound();
              if (onOpenRemindersModal) {
                onOpenRemindersModal();
              } else {
                setIsRemindersModalOpen(true);
              }
            }}
            className="bg-[#fff1f2] hover:bg-[#ffe4e6] border-2 border-[#fecdd3] hover:border-[#dc2626] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <span className="bg-[#ffe4e6] text-[#9f1239] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <span>⏰</span>
                <span>{dueRemindersCount || 3} due</span>
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-[#881337] tracking-tight group-hover:text-[#4c0519] transition-colors">
                  Reminders
                </h3>
                <ChevronRight className="w-6 h-6 text-[#dc2626] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[#9f1239] text-sm sm:text-base font-semibold mt-1 truncate">
                {nextReminderSubtitle}
              </p>
            </div>
          </div>

          {/* ROW 4 - My Profile (Full Width spanning 2 columns) */}
          <div className="md:col-span-2">
            <div
              id="home-card-profile"
              onClick={() => {
                playClickSound();
                onNavigate("profile");
              }}
              className="w-full bg-[#f5f3ff] hover:bg-[#ede9fe] border-2 border-[#ddd6fe] hover:border-[#7c3aed] rounded-3xl p-6 sm:p-7 transition-all cursor-pointer group flex flex-col justify-between min-h-[165px] active:scale-[0.99] shadow-xs hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <User className="w-7 h-7 text-white" />
                </div>
                <span className="bg-[#ede9fe] text-[#5b21b6] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <span>👤</span>
                  <span>My Profile</span>
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl sm:text-3xl font-black text-[#4c1d95] tracking-tight group-hover:text-[#2e1065] transition-colors">
                    My Profile
                  </h3>
                  <ChevronRight className="w-6 h-6 text-[#7c3aed] group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[#5b21b6] text-sm sm:text-base font-semibold mt-1">
                  Personal details, emergency contacts & sound preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOS ACTION BELOW MAIN CARDS - MEDIUM-SIZED BUTTON (Matches Reference Screenshot 1) */}
      <section aria-label="Emergency Assistance" className="pt-2 pb-6 flex flex-col items-center justify-center text-center">
        <button
          id="home-emergency-sos-btn"
          onClick={() => {
            playClickSound();
            onOpenSosModal();
          }}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-4.5 rounded-full bg-gradient-to-r from-red-600 via-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-lg sm:text-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5 text-white" />
          </div>
          <span className="bg-white/30 text-white text-xs font-black px-2 py-0.5 rounded-md">
            SOS
          </span>
          <span>Emergency Assistance (SOS)</span>
        </button>
        <p className="text-slate-600 text-sm sm:text-base font-semibold mt-2.5 text-center max-w-md">
          Press anytime to instantly alert family and your doctor
        </p>
      </section>

      {/* REMINDERS MODAL (Elderly-Friendly, high contrast, large touch targets) */}
      {isRemindersModalOpen && (
        <div
          id="home-reminders-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setIsRemindersModalOpen(false)}
        >
          <div
            id="home-reminders-modal-dialog"
            className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-2xl space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl border border-amber-200">
                  ⏰
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {t("dailyReminders")}
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    {completedRemindersCount} of {reminders.length} tasks completed today
                  </p>
                </div>
              </div>

              <button
                id="close-reminders-modal-btn"
                onClick={() => {
                  playClickSound();
                  setIsRemindersModalOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Button */}
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">
                Today's Schedule
              </span>
              <button
                id="modal-toggle-add-reminder-btn"
                onClick={() => {
                  playClickSound();
                  setShowAddReminder(!showAddReminder);
                }}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-sm border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t("addReminder")}</span>
              </button>
            </div>

            {/* Add Reminder Form */}
            {showAddReminder && (
              <form
                onSubmit={handleAddReminder}
                className="p-5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    placeholder={t("newReminderTitle")}
                    className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-base font-semibold focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="sm:w-36 px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-base font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddReminder(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200/60 font-bold text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm cursor-pointer shadow-xs"
                  >
                    {t("saveReminder")}
                  </button>
                </div>
              </form>
            )}

            {/* Reminders List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {reminders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-semibold text-base">
                  {t("noRemindersYet")}
                </div>
              ) : (
                reminders.map((rem) => (
                  <div
                    key={rem.id}
                    onClick={() => handleToggleReminder(rem)}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      rem.isCompleted
                        ? "bg-emerald-50/50 border-emerald-200 text-slate-500"
                        : "bg-slate-50 hover:bg-blue-50/60 border-slate-200 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        type="button"
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          rem.isCompleted
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : "border-slate-300 bg-white"
                        }`}
                        aria-label={rem.isCompleted ? "Mark incomplete" : "Mark completed"}
                      >
                        {rem.isCompleted && <CheckCircle2 className="w-6 h-6" />}
                      </button>
                      <div className="min-w-0">
                        <h4
                          className={`text-base sm:text-lg font-bold leading-snug truncate ${
                            rem.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {rem.title}
                        </h4>
                        <span className="text-xs sm:text-sm text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5" /> {rem.timeOfDay}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full shrink-0 border ${
                        rem.isCompleted
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }`}
                    >
                      {rem.isCompleted ? t("completed") : t("pending")}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsRemindersModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

