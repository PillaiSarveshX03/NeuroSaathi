import React, { useState } from "react";
import { UserProfile, SosEvent } from "../types";
import { neurosathiDb } from "../lib/supabase";
import { playClickSound, playSosAlertSound } from "../lib/audio";
import { AlertTriangle, Phone, ShieldAlert, X, CheckCircle } from "lucide-react";

interface Props {
  currentUser: UserProfile;
  onClose: () => void;
}

export const SosEmergencyModal: React.FC<Props> = ({ currentUser, onClose }) => {
  const [isTriggered, setIsTriggered] = useState(false);
  const [sosEvent, setSosEvent] = useState<SosEvent | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);

  const handleSendSos = async () => {
    playClickSound();
    playSosAlertSound();
    setIsSending(true);
    setSosError(null);

    try {
      const event = await neurosathiDb.triggerSos(
        currentUser,
        "Emergency SOS alert dispatched from NeuroSathi home interface."
      );
      setSosEvent(event);
      setIsTriggered(true);
    } catch (err: any) {
      console.error("SOS trigger error via Supabase", err);
      setSosError(err.message || "Failed to dispatch emergency alert.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border-4 border-rose-500 relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          id="close-sos-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-2xl font-bold transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {!isTriggered ? (
          <>
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50 animate-bounce">
              <AlertTriangle className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              EMERGENCY SOS
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-2 leading-relaxed">
              Pressing the button below immediately sends an emergency distress signal to your connected doctor and records the event in your safety log.
            </p>

            {sosError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-semibold">
                ⚠️ Emergency Alert Error: {sosError}
              </div>
            )}

            <button
              id="confirm-sos-dispatch-btn"
              onClick={handleSendSos}
              disabled={isSending}
              className="mt-8 w-44 h-44 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-3xl shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all transform hover:scale-105 active:scale-95 ring-12 ring-rose-200 animate-pulse"
            >
              <ShieldAlert className="w-14 h-14 mb-1" />
              <span>SOS</span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1">Tap to Alert</span>
            </button>

            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-200 w-full text-left">
              <span className="text-xs font-bold uppercase text-slate-500 block mb-2">Emergency Hotlines</span>
              <div className="flex justify-between items-center text-slate-800 text-sm font-semibold">
                <span>National Emergency:</span>
                <a href="tel:112" className="text-blue-700 underline font-mono text-base">112</a>
              </div>
              <div className="flex justify-between items-center text-slate-800 text-sm font-semibold mt-1">
                <span>Medical Ambulance:</span>
                <a href="tel:108" className="text-blue-700 underline font-mono text-base">108</a>
              </div>
            </div>
          </>
        ) : (
          <div className="py-4 flex flex-col items-center w-full animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
              <CheckCircle className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Alert Sent to Doctor!
            </h2>
            <p className="text-slate-700 text-base sm:text-lg mt-2 leading-relaxed">
              Your distress signal has been logged and dispatched to your physician.
            </p>

            <div className="my-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl w-full text-left text-sm text-emerald-900 space-y-1">
              <div><strong>Patient:</strong> {currentUser.fullName} ({currentUser.mobileNumber || "Mobile on file"})</div>
              <div><strong>Status:</strong> Active Emergency Event</div>
              <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg rounded-2xl transition-all cursor-pointer"
            >
              Close & Return to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
