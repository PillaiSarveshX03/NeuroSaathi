import React, { useState, useEffect } from "react";
import { UserProfile } from "./types";
import { neurosathiDb, INITIAL_DEMO_PATIENT } from "./lib/supabase";
import { getTranslation } from "./lib/languages";
import { Navbar } from "./components/Navbar";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { GamesView } from "./components/GamesView";
import { AiChatView } from "./components/AiChatView";
import { DoctorPatientView } from "./components/DoctorPatientView";
import { ProgressReportView } from "./components/ProgressReportView";
import { ProfileView } from "./components/ProfileView";
import { RemindersModal } from "./components/RemindersModal";
import { GameRunnerModal } from "./components/games/GameRunnerModal";
import { AiVoiceModal } from "./components/AiVoiceModal";
import { SosEmergencyModal } from "./components/SosEmergencyModal";
import { AuthModal } from "./components/AuthModal";

// Default elderly patient profile for instant welcoming experience (valid UUID)
const DEFAULT_PATIENT: UserProfile = INITIAL_DEMO_PATIENT;

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_PATIENT);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("Hindi");
  const [activeTab, setActiveTab] = useState<string>("home");

  // Modals
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);

  useEffect(() => {
    // Check if user session already exists in database
    const initAuth = async () => {
      const user = await neurosathiDb.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        if (user.preferredLanguage) {
          setSelectedLanguage(user.preferredLanguage);
        }
        if (user.role === "doctor") {
          setActiveTab("doctor");
        }
      }
    };
    initAuth();
  }, []);

  const handleLanguageChange = async (lang: string) => {
    setSelectedLanguage(lang);
    setCurrentUser((prev) => {
      const updated = { ...prev, preferredLanguage: lang };
      neurosathiDb.saveProfile(updated).catch((e) => {
        console.warn("Could not save preferred language to profile:", e);
      });
      return updated;
    });
  };

  const handleLaunchGame = (gameId: string) => {
    setActiveGameId(gameId);
  };

  const handleSignOut = async () => {
    await neurosathiDb.signOut();
    setIsAuthModalOpen(true);
  };

  const t = (key: string) => getTranslation(selectedLanguage, key);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-200 relative">
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        onOpenSosModal={() => setIsSosModalOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Role & Switch Bar */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">{t("activeUser")}:</span>
            <strong className="text-slate-900 font-bold">{currentUser.fullName}</strong>
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] uppercase ${
                currentUser.role === "doctor"
                  ? "bg-teal-100 text-teal-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {currentUser.role === "doctor" ? t("doctor") : t("patient")}
            </span>
          </div>

          <button
            id="switch-account-button"
            onClick={() => setIsAuthModalOpen(true)}
            className="text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
          >
            {t("switchAccount")}
          </button>
        </div>
      </div>

      {/* Main View Container with adequate bottom spacing for fixed bottom navigation */}
      <main className="flex-1 pb-28 sm:pb-36">
        {activeTab === "home" && (
          <HomeView
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            onNavigate={setActiveTab}
            onLaunchGame={handleLaunchGame}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onOpenSosModal={() => setIsSosModalOpen(true)}
            onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
          />
        )}

        {activeTab === "games" && (
          <GamesView
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            onLaunchGame={handleLaunchGame}
          />
        )}

        {activeTab === "chat" && (
          <AiChatView
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            onLaunchGame={handleLaunchGame}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onLanguageChange={handleLanguageChange}
          />
        )}

        {activeTab === "doctor" && (
          <DoctorPatientView
            currentUser={currentUser}
            onProfileUpdate={setCurrentUser}
            onOpenSosModal={() => setIsSosModalOpen(true)}
          />
        )}

        {activeTab === "report" && (
          <ProgressReportView currentUser={currentUser} />
        )}

        {activeTab === "profile" && (
          <ProfileView
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            onProfileUpdate={setCurrentUser}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* FIXED BOTTOM NAVIGATION */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        selectedLanguage={selectedLanguage}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
      />

      {/* Reminders Modal (Accessible anywhere via bottom nav or home card) */}
      <RemindersModal
        isOpen={isRemindersModalOpen}
        onClose={() => setIsRemindersModalOpen(false)}
        currentUser={currentUser}
        selectedLanguage={selectedLanguage}
      />

      {/* Active Game Modal */}
      {activeGameId && (
        <GameRunnerModal
          gameId={activeGameId}
          currentUser={currentUser}
          onClose={() => setActiveGameId(null)}
        />
      )}

      {/* Voice Mode Modal */}
      {isVoiceModalOpen && (
        <AiVoiceModal
          currentUser={currentUser}
          selectedLanguage={selectedLanguage}
          onClose={() => setIsVoiceModalOpen(false)}
          onLaunchGame={(gameId) => {
            setIsVoiceModalOpen(false);
            setActiveGameId(gameId);
          }}
          onLanguageChange={handleLanguageChange}
        />
      )}

      {/* Emergency SOS Modal */}
      {isSosModalOpen && (
        <SosEmergencyModal
          currentUser={currentUser}
          onClose={() => setIsSosModalOpen(false)}
        />
      )}

      {/* Auth Login / Signup Modal */}
      {isAuthModalOpen && (
        <AuthModal
          preferredLanguage={selectedLanguage}
          onSuccess={(user) => {
            setCurrentUser(user);
            if (user.preferredLanguage) {
              setSelectedLanguage(user.preferredLanguage);
            }
            if (user.role === "doctor") {
              setActiveTab("doctor");
            }
            setIsAuthModalOpen(false);
          }}
          onCancel={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
