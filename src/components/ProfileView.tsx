import React, { useState } from "react";
import { UserProfile } from "../types";
import { neurosathiDb } from "../lib/supabase";
import { LANGUAGES_LIST } from "../lib/languages";
import { playClickSound, playSuccessSound, playMistakeSound } from "../lib/audio";
import { User, Shield, Stethoscope, Save, LogOut, Globe, Heart } from "lucide-react";

interface Props {
  currentUser: UserProfile;
  selectedLanguage: string;
  onLanguageChange: (langName: string) => void;
  onProfileUpdate: (updated: UserProfile) => void;
  onSignOut: () => void;
}

export const ProfileView: React.FC<Props> = ({
  currentUser,
  selectedLanguage,
  onLanguageChange,
  onProfileUpdate,
  onSignOut,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [age, setAge] = useState(currentUser.age?.toString() || "");
  const [mobileNumber, setMobileNumber] = useState(currentUser.mobileNumber || "");
  const [emergencyName, setEmergencyName] = useState(currentUser.emergencyContactName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser.emergencyContactPhone || "");
  const [medicalNotes, setMedicalNotes] = useState(currentUser.medicalNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const updated: UserProfile = {
      ...currentUser,
      fullName: fullName.trim(),
      age: age ? parseInt(age, 10) : undefined,
      mobileNumber: mobileNumber.trim(),
      emergencyContactName: emergencyName.trim(),
      emergencyContactPhone: emergencyPhone.trim(),
      medicalNotes: medicalNotes.trim(),
      preferredLanguage: selectedLanguage,
    };

    try {
      await neurosathiDb.updateProfile(updated);
      onProfileUpdate(updated);
      playSuccessSound();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save profile in Supabase:", err);
      setSaveError(err.message || "Failed to save profile.");
      playMistakeSound();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
      {/* Header Banner (Matches Homepage dignified architecture) */}
      <div className="bg-[#074738] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#043328] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4.5">
          <div className="w-16 h-16 rounded-2xl bg-[#7c3aed] border-2 border-purple-300 flex items-center justify-center text-3xl shadow-xs shrink-0">
            {currentUser.role === "doctor" ? "🩺" : "👤"}
          </div>
          <div>
            <span className="text-xs uppercase font-black text-amber-300 tracking-wider block">
              {currentUser.role === "doctor" ? "Verified Doctor Account" : "Patient Care Profile"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white">{currentUser.fullName}</h1>
            <p className="text-emerald-100 text-sm font-semibold mt-0.5">
              Account ID: <span className="font-mono">{currentUser.id.slice(0, 13)}...</span>
            </p>
          </div>
        </div>

        <button
          id="profile-signout-btn"
          onClick={() => {
            playClickSound();
            onSignOut();
          }}
          className="px-5 py-3 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-base flex items-center gap-2 cursor-pointer transition-all shadow-xs shrink-0 active:scale-95 border border-red-700"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Form Card (High Contrast, 2px borders, large bold text) */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-300 shadow-xs space-y-7"
      >
        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 pb-3 border-b-2 border-slate-100">
          <User className="w-6 h-6 text-[#7c3aed]" />
          <span>Personal Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-base font-black text-slate-900 mb-2">Full Name</label>
            <input
              id="profile-fullname-input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold text-base sm:text-lg focus:border-[#7c3aed] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-black text-slate-900 mb-2">
              {currentUser.role === "doctor" ? "Specialization" : "Age (Years)"}
            </label>
            <input
              id="profile-age-input"
              type={currentUser.role === "doctor" ? "text" : "number"}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={currentUser.role === "doctor" ? "Neurology / Geriatrics" : "e.g. 72"}
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold text-base sm:text-lg focus:border-[#7c3aed] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-black text-slate-900 mb-2">Mobile Contact Number</label>
            <input
              id="profile-phone-input"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold text-base sm:text-lg focus:border-[#7c3aed] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-black text-slate-900 mb-2 flex items-center gap-1.5">
              <Globe className="w-5 h-5 text-[#0d6e5a]" />
              <span>Preferred Language (46 Available)</span>
            </label>
            <select
              id="profile-language-select"
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold text-base sm:text-lg focus:border-[#7c3aed] focus:outline-none cursor-pointer"
            >
              {LANGUAGES_LIST.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentUser.role === "patient" && (
          <>
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 pt-4 pb-3 border-b-2 border-slate-100">
              <Shield className="w-6 h-6 text-[#dc2626]" />
              <span>Emergency Contact & Health Safeguards</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-black text-slate-900 mb-2">
                  Caregiver / Family Contact Name
                </label>
                <input
                  id="profile-emergency-name"
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma (Son)"
                  className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold text-base sm:text-lg focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-base font-black text-slate-900 mb-2">
                  Emergency Phone Number
                </label>
                <input
                  id="profile-emergency-phone"
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="e.g. +91 98765 00000"
                  className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold text-base sm:text-lg focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-base font-black text-slate-900 mb-2 flex items-center gap-1.5">
                  <Heart className="w-5 h-5 text-rose-600" />
                  <span>Important Medical Notes & Allergies (visible to your doctor)</span>
                </label>
                <textarea
                  id="profile-medical-notes"
                  rows={3}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Any medications, mild cognitive impairment notes, pacemaker, allergies, etc."
                  className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-semibold focus:border-[#7c3aed] focus:outline-none text-base"
                />
              </div>
            </div>
          </>
        )}

        {currentUser.role === "doctor" && (
          <div className="p-5 bg-[#e8fbf6] border-2 border-[#a7f0df] rounded-2xl text-[#074738] text-base leading-relaxed">
            <span className="font-black text-lg block mb-1 flex items-center gap-2">
              <Stethoscope className="w-5 h-5" /> Doctor Identification
            </span>
            <span>
              Your assigned Doctor ID is <strong className="font-mono text-lg font-black text-[#043328]">{currentUser.doctorId}</strong>. Give this ID to your patients to enable them to connect and consult with you directly in real-time.
            </span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-900 font-black text-center text-base">
            ✅ Profile changes saved successfully!
          </div>
        )}

        {saveError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-rose-900 font-black text-center text-base">
            ⚠️ Save Error: {saveError}
          </div>
        )}

        <div className="flex justify-end pt-3">
          <button
            id="profile-save-btn"
            type="submit"
            disabled={isSaving}
            className="px-9 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black text-lg rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2.5 active:scale-95"
          >
            <Save className="w-6 h-6" />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
