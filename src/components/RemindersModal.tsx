import React, { useState, useEffect } from "react";
import { UserProfile, DailyReminder } from "../types";
import { neurosathiDb } from "../lib/supabase";
import { playClickSound, playSuccessSound } from "../lib/audio";
import { getTranslation } from "../lib/languages";
import { Clock, CheckCircle2, Plus, X, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  selectedLanguage: string;
  onRemindersChanged?: () => void;
}

export const RemindersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  selectedLanguage,
  onRemindersChanged,
}) => {
  const [reminders, setReminders] = useState<DailyReminder[]>([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("10:00 AM");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = (key: string) => getTranslation(selectedLanguage, key);

  useEffect(() => {
    if (isOpen) {
      loadReminders();
    }
  }, [isOpen, currentUser.id]);

  const loadReminders = async () => {
    try {
      const data = await neurosathiDb.getReminders(currentUser.id);
      setReminders(data);
    } catch (err: any) {
      console.error("Failed to load reminders:", err);
      setErrorMessage("Could not load reminders from cloud storage.");
    }
  };

  const handleToggleReminder = async (rem: DailyReminder) => {
    playClickSound();
    setErrorMessage(null);
    try {
      await neurosathiDb.toggleReminder(rem.id, !rem.isCompleted);
      setReminders((prev) =>
        prev.map((r) => (r.id === rem.id ? { ...r, isCompleted: !r.isCompleted } : r))
      );
      if (!rem.isCompleted) {
        playSuccessSound();
      }
      if (onRemindersChanged) {
        onRemindersChanged();
      }
    } catch (err: any) {
      console.error("Failed to toggle reminder:", err);
      setErrorMessage(`Failed to update reminder: ${err.message || "Please try again."}`);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    playClickSound();
    setErrorMessage(null);

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
      if (onRemindersChanged) {
        onRemindersChanged();
      }
    } catch (err: any) {
      console.error("Failed to add reminder:", err);
      setErrorMessage(`Failed to add reminder: ${err.message || "Please try again."}`);
    }
  };

  if (!isOpen) return null;

  const completedCount = reminders.filter((r) => r.isCompleted).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-6 border-2 border-slate-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#fff1f2] text-[#e11d48] flex items-center justify-center text-2xl border-2 border-[#fecdd3]">
              ⏰
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {t("dailyReminders") || "Daily Reminders"}
              </h3>
              <p className="text-sm font-bold text-slate-600">
                {completedCount} of {reminders.length} tasks completed today
              </p>
            </div>
          </div>

          <button
            id="close-reminders-modal-btn"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer transition-colors border border-slate-300"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 text-sm font-bold flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Add Button */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-slate-900">
            Today's Schedule
          </span>
          <button
            id="modal-toggle-add-reminder-btn"
            onClick={() => {
              playClickSound();
              setShowAddReminder(!showAddReminder);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#e8fbf6] hover:bg-[#d1f7ee] text-[#074738] font-black text-sm border-2 border-[#a7f0df] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t("addReminder") || "Add Reminder"}</span>
          </button>
        </div>

        {/* Add Reminder Form */}
        {showAddReminder && (
          <form
            onSubmit={handleAddReminder}
            className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                placeholder={t("newReminderTitle") || "e.g., Take BP medicine (Telmisartan 40mg)"}
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-slate-900 text-base font-bold focus:outline-none focus:border-[#074738]"
              />
              <input
                type="text"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                placeholder="10:00 AM"
                className="sm:w-36 px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-slate-900 text-base font-bold focus:outline-none focus:border-[#074738]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddReminder(false)}
                className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-200 font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#074738] hover:bg-[#05362a] text-white font-extrabold rounded-xl text-sm cursor-pointer shadow-xs"
              >
                {t("saveReminder") || "Save Reminder"}
              </button>
            </div>
          </form>
        )}

        {/* Reminders List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {reminders.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-bold text-base">
              {t("noRemindersYet") || "No reminders set for today. Click Add Reminder above."}
            </div>
          ) : (
            reminders.map((rem) => (
              <div
                key={rem.id}
                onClick={() => handleToggleReminder(rem)}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  rem.isCompleted
                    ? "bg-[#e8fbf6]/50 border-emerald-300 text-slate-600"
                    : "bg-white hover:bg-slate-50 border-slate-300 text-slate-900 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      rem.isCompleted
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                        : "border-slate-400 bg-white hover:border-emerald-600"
                    }`}
                    aria-label={rem.isCompleted ? "Mark incomplete" : "Mark completed"}
                  >
                    {rem.isCompleted && <CheckCircle2 className="w-6 h-6" />}
                  </button>
                  <div className="min-w-0">
                    <h4
                      className={`text-base sm:text-lg font-black leading-snug truncate ${
                        rem.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {rem.title}
                    </h4>
                    <span className="text-xs sm:text-sm text-slate-600 font-bold flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-4 h-4 text-slate-500" /> {rem.timeOfDay}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-black px-3 py-1 rounded-full shrink-0 border-2 ${
                    rem.isCompleted
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}
                >
                  {rem.isCompleted ? t("completed") || "Done" : t("pending") || "Pending"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t-2 border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-[#074738] hover:bg-[#05362a] text-white font-extrabold text-base cursor-pointer transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
