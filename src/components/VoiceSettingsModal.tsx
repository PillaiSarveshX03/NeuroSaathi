import React, { useState } from "react";
import {
  getStoredSpeechRate,
  setStoredSpeechRate,
  speakSpeech,
  stopAnySpeech,
} from "../lib/voiceService";
import { Volume2, Square, X, Check, Gauge } from "lucide-react";
import { playClickSound } from "../lib/audio";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage?: string;
}

export const VoiceSettingsModal: React.FC<Props> = ({ isOpen, onClose, currentLanguage = "English" }) => {
  const [speechRate, setSpeechRate] = useState<number>(getStoredSpeechRate());
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  if (!isOpen) return null;

  const handleSelectRate = (rate: number) => {
    playClickSound();
    stopAnySpeech();
    setIsPlayingSample(false);
    setSpeechRate(rate);
    setStoredSpeechRate(rate);
  };

  const handleTestVoice = () => {
    playClickSound();
    if (isPlayingSample) {
      stopAnySpeech();
      setIsPlayingSample(false);
      return;
    }

    setIsPlayingSample(true);
    const samplePhrase =
      currentLanguage.toLowerCase().includes("hindi")
        ? "नमस्ते! यह मेरी आवाज़ का नमूना है। मैं बिल्कुल स्पष्ट और सहज बोल रहा हूँ।"
        : "Hello! This is a sample of my voice. I am speaking clearly and naturally.";

    speakSpeech({
      text: samplePhrase,
      rate: speechRate,
      onStart: () => setIsPlayingSample(true),
      onEnd: () => setIsPlayingSample(false),
      onError: () => setIsPlayingSample(false),
    });
  };

  const handleClose = () => {
    stopAnySpeech();
    setIsPlayingSample(false);
    onClose();
  };

  const speedOptions = [
    {
      rate: 0.82,
      label: "Gentle & Slow",
      description: "Deliberate and extra-patient pacing. Best for memory support and deep focus.",
    },
    {
      rate: 0.92,
      label: "Elder-Tuned (Recommended)",
      description: "Clear, warm, natural cadence tailored for effortless listening.",
    },
    {
      rate: 1.0,
      label: "Normal Speed",
      description: "Standard conversational speaking speed.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border-2 border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#e8fbf6] border-2 border-[#a7f0df] text-[#074738] flex items-center justify-center text-2xl shadow-xs">
              <Volume2 className="w-6 h-6 text-[#074738]" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">Voice & Speech Settings</h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                Web Speech natural voice output tailored for clarity
              </p>
            </div>
          </div>
          <button
            id="close-voice-settings-btn"
            onClick={handleClose}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Speech Rate & Pacing Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#074738]" /> Speaking Speed & Pacing
            </label>
            <span className="text-xs font-bold text-[#074738] bg-[#e8fbf6] px-2.5 py-0.5 rounded-md border border-[#a7f0df]">
              {speechRate}x
            </span>
          </div>

          <div className="space-y-2.5">
            {speedOptions.map((opt) => {
              const isSelected = Math.abs(speechRate - opt.rate) < 0.03;
              return (
                <button
                  key={opt.rate}
                  type="button"
                  onClick={() => handleSelectRate(opt.rate)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#e8fbf6] border-[#074738] text-slate-900 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{opt.label}</span>
                      {opt.rate === 0.92 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{opt.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#074738] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Test Audio & Done Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            id="test-voice-sample-btn"
            type="button"
            onClick={handleTestVoice}
            className={`px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center gap-2 transition cursor-pointer active:scale-95 ${
              isPlayingSample
                ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                : "bg-white border-slate-300 hover:bg-slate-50 text-slate-800"
            }`}
          >
            {isPlayingSample ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Sample</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[#074738]" />
                <span>Test Voice Sample</span>
              </>
            )}
          </button>

          <button
            id="save-voice-settings-btn"
            type="button"
            onClick={handleClose}
            className="px-6 py-3 rounded-2xl bg-[#074738] hover:bg-[#043328] text-white font-black text-sm shadow-xs transition cursor-pointer active:scale-95"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
