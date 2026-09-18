import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import { LANGUAGES_LIST } from "../lib/languages";
import { neurosathiDb, DEMO_DOCTOR_USER_UUID } from "../lib/supabase";
import { playClickSound, playSuccessSound, playMistakeSound } from "../lib/audio";
import {
  speakSpeech,
  stopAnySpeech,
  getStoredVoiceName,
  getStoredVoiceEngine,
} from "../lib/voiceService";
import { Mic, MicOff, Volume2, X, Sparkles, AlertCircle } from "lucide-react";

interface Props {
  currentUser: UserProfile;
  selectedLanguage: string;
  onClose: () => void;
  onLaunchGame: (gameId: string) => void;
  onLanguageChange?: (lang: string) => void;
}

export const AiVoiceModal: React.FC<Props> = ({
  currentUser,
  selectedLanguage,
  onClose,
  onLaunchGame,
  onLanguageChange,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDeniedPermission, setHasDeniedPermission] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isHandlingPromptRef = useRef(false);

  const langMeta =
    LANGUAGES_LIST.find((l) => l.name.toLowerCase() === selectedLanguage.toLowerCase()) ||
    LANGUAGES_LIST.find((l) => l.code === "en")!;

  useEffect(() => {
    // Setup Speech Recognition if available
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        "Voice recognition is not supported in this browser. Please use the AI Chat feature instead."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langMeta.speechCode || "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
    };

    recognition.onresult = (event: any) => {
      let finalStr = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          setTranscript(event.results[i][0].transcript);
        }
      }
      if (finalStr && !isHandlingPromptRef.current) {
        isHandlingPromptRef.current = true;
        try {
          recognitionRef.current?.stop();
        } catch {}
        setIsListening(false);
        setTranscript(finalStr);
        handleSendVoicePrompt(finalStr);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setHasDeniedPermission(true);
        setErrorMessage(
          "Microphone permission was denied. Please allow microphone access in your browser settings to use Voice Mode."
        );
      } else if (event.error === "no-speech") {
        // Just silent timeout or user paused
      } else if (event.error === "network") {
        setErrorMessage(
          "Network Connection Notice: Your browser's speech-to-text service could not connect to its recognition server. This often occurs when using an ad-blocker, VPN, strict browser privacy setting (such as Brave Shields), or inside an embedded frame. You can tap 'Try Again', use text chat, or open the app in a new browser tab."
        );
      } else {
        setErrorMessage(`Voice service notice (${event.error}). Please tap 'Try Again' or use text chat.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      stopAnySpeech();
    };
  }, [selectedLanguage]);

  const requestMicAndListen = async () => {
    if (hasDeniedPermission) {
      setErrorMessage(
        "Microphone permission was denied. Please allow microphone access in your browser settings."
      );
      return;
    }

    playClickSound();
    setErrorMessage(null);
    isHandlingPromptRef.current = false;

    // First ensure getUserMedia permission is requested safely
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      console.warn("getUserMedia error:", err);
      setHasDeniedPermission(true);
      setErrorMessage(
        "Microphone access could not be granted. Please check browser permissions."
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        setTranscript("");
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition start issue:", e);
      }
    }
  };

  const stopListening = () => {
    playClickSound();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const handleSendVoicePrompt = async (text: string) => {
    stopAnySpeech();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          language: selectedLanguage,
          userRole: currentUser.role,
          userName: currentUser.fullName,
          userId: currentUser.id,
          userContext: {
            age: currentUser.age,
            connectedDoctorId: currentUser.connectedDoctorId,
            emergencyContactName: currentUser.emergencyContactName,
            emergencyContactPhone: currentUser.emergencyContactPhone,
            medicalNotes: currentUser.medicalNotes,
          },
        }),
      });

      const data = await res.json();
      const reply = data.reply || "I am right here with you.";
      const launchGame = data.launchGame;
      const resolvedLang = data.resolvedLanguage;
      const finalLangCode = resolvedLang?.resolvedCode || selectedLanguage;
      const finalSpeechCode = resolvedLang?.speechCode || langMeta.speechCode;

      // If explicit command was spoken, notify parent component to switch preference
      if (resolvedLang?.shouldUpdatePreference && onLanguageChange && resolvedLang.resolvedCode) {
        onLanguageChange(resolvedLang.resolvedCode);
      }

      // Persist to client database with resolved language code
      await neurosathiDb.saveAiMessage(currentUser.id, "user", text, finalLangCode);
      await neurosathiDb.saveAiMessage(currentUser.id, "model", reply, finalLangCode, launchGame);

      // If AI agent created a reminder, persist to client DB as well
      if (data.actionResult?.type === "reminder_created" && data.actionResult.reminder) {
        try {
          await neurosathiDb.addReminder({
            userId: currentUser.id,
            title: data.actionResult.reminder.title,
            time: data.actionResult.reminder.time,
            category: data.actionResult.reminder.category || "medication",
            isCompleted: false,
          });
        } catch (rErr) {
          console.warn("Could not sync reminder to local db:", rErr);
        }
      }

      // If AI agent triggered real SOS, synchronize with client db
      if (data.actionResult?.type === "sos_triggered") {
        try {
          await neurosathiDb.triggerSos(currentUser, data.actionResult.reason);
        } catch (sErr) {
          console.warn("Could not sync SOS to local db:", sErr);
        }
      }

      // If AI agent sent a doctor message, record in client chat messages
      if (data.actionResult?.type === "doctor_message_sent") {
        try {
          const doc = currentUser.connectedDoctorId ? await neurosathiDb.getDoctorById(currentUser.connectedDoctorId) : null;
          await neurosathiDb.sendMessage({
            senderId: currentUser.id,
            receiverId: doc?.userId || DEMO_DOCTOR_USER_UUID,
            messageText: data.actionResult.messageText,
            isDoctor: false,
            isRead: false,
          });
        } catch (mErr) {
          console.warn("Could not sync doctor message to local db:", mErr);
        }
      }

      setAiResponse(reply);
      playSuccessSound();

      // Speak response out loud using Web Speech Synthesis in resolved language
      speakText(reply, finalSpeechCode, () => {
        if (launchGame && launchGame.id) {
          onClose();
          onLaunchGame(launchGame.id);
        }
      });
    } catch (err) {
      console.error("Voice chat error:", err);
      setErrorMessage("Could not reach AI server. Please try again.");
    } finally {
      setIsProcessing(false);
      isHandlingPromptRef.current = false;
    }
  };

  const speakText = (text: string, customSpeechCode?: string, onEnd?: () => void) => {
    stopAnySpeech();
    setIsSpeaking(true);

    speakSpeech({
      text,
      preferredVoice: getStoredVoiceName(),
      engine: getStoredVoiceEngine(),
      speechCode: customSpeechCode || langMeta.speechCode || "en-US",
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      },
      onError: () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      },
    });
  };

  const stopSpeaking = () => {
    stopAnySpeech();
    setIsSpeaking(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl flex flex-col items-center relative border-2 border-slate-200">
        {/* Close Button */}
        <button
          id="close-voice-modal-btn"
          onClick={() => {
            stopListening();
            stopSpeaking();
            onClose();
          }}
          className="absolute top-5 right-5 w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xl font-bold transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title & Active Voice Indicator */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-[#e8fbf6] border border-[#a7f0df] text-[#074738] text-xs font-black px-3.5 py-1 rounded-full mb-2">
            <Volume2 className="w-3.5 h-3.5 text-[#074738]" />
            <span>Voice: Web Speech</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Speak with your Companion
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-bold">
            Language: <strong className="text-[#074738]">{selectedLanguage}</strong>
          </p>
        </div>

        {/* Big Interactive Pulse Mic Button */}
        <div className="my-6 flex flex-col items-center">
          <button
            id="voice-mic-main-button"
            onClick={isListening ? stopListening : requestMicAndListen}
            disabled={isProcessing}
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl cursor-pointer active:scale-95 ${
              isListening
                ? "bg-rose-600 text-white ring-12 ring-rose-200 animate-pulse scale-105"
                : isSpeaking
                ? "bg-[#074738] text-white ring-12 ring-[#a7f0df] animate-pulse"
                : "bg-[#074738] hover:bg-[#043328] text-white hover:scale-105"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-14 h-14 mb-1" />
                <span className="text-xs font-black uppercase tracking-wider">Listening</span>
              </>
            ) : isSpeaking ? (
              <>
                <Volume2 className="w-14 h-14 mb-1 animate-bounce" />
                <span className="text-xs font-black uppercase tracking-wider">Speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-14 h-14 mb-1 text-[#a7f0df]" />
                <span className="text-xs font-black uppercase tracking-wider">Tap to Speak</span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Status / Transcript */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[110px] flex flex-col justify-center text-center mb-4">
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#074738] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#074738] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#074738] animate-bounce" />
            </div>
          ) : isListening ? (
            <p className="text-blue-900 font-bold text-lg">
              {transcript || "Listening... Speak clearly into your microphone."}
            </p>
          ) : aiResponse ? (
            <p className="text-slate-800 text-base sm:text-lg leading-relaxed font-medium">
              "{aiResponse}"
            </p>
          ) : (
            <p className="text-slate-500 text-sm">
              Tap the blue microphone and ask: "मुझे कोई मेमोरी गेम खिलाओ" or "How is my memory doing?"
            </p>
          )}
        </div>

        {/* Error Alert with Quick Actions */}
        {errorMessage && (
          <div className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-950 text-xs sm:text-sm font-semibold flex flex-col gap-3 mb-4 text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-snug text-slate-800">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-amber-200/80">
              <button
                id="voice-retry-btn"
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  requestMicAndListen();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#074738] hover:bg-[#043328] text-white font-black text-xs transition cursor-pointer active:scale-95 shadow-2xs"
              >
                🔄 Try Again
              </button>
              <button
                id="voice-switch-to-text-btn"
                type="button"
                onClick={() => {
                  stopSpeaking();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                💬 Switch to Text Chat
              </button>
            </div>
          </div>
        )}

        {/* Stop audio button if speaking */}
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-sm cursor-pointer transition-colors"
          >
            ⏹️ Stop Audio
          </button>
        )}
      </div>
    </div>
  );
};
