import React, { useState, useEffect, useRef } from "react";
import { UserProfile, AiChatMessage } from "../types";
import { neurosathiDb, DEMO_DOCTOR_USER_UUID } from "../lib/supabase";
import { LANGUAGES_LIST } from "../lib/languages";
import { getLanguageCapability } from "../lib/languageCapabilities";
import { playClickSound, playSuccessSound } from "../lib/audio";
import {
  speakSpeech,
  stopAnySpeech,
  getStoredVoiceName,
  getStoredVoiceEngine,
  VoiceName,
  VoiceEngine,
} from "../lib/voiceService";
import { VoiceSettingsModal } from "./VoiceSettingsModal";
import { Send, Bot, User, Sparkles, Mic, MicOff, Volume2, VolumeX, AlertCircle, Globe, Settings, Sliders } from "lucide-react";

interface Props {
  currentUser: UserProfile;
  selectedLanguage: string;
  onLaunchGame: (gameId: string) => void;
  onOpenVoiceModal: () => void;
  onLanguageChange?: (lang: string) => void;
}

export const AiChatView: React.FC<Props> = ({
  currentUser,
  selectedLanguage,
  onLaunchGame,
  onOpenVoiceModal,
  onLanguageChange,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>(getStoredVoiceEngine());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasDispatchedVoicePromptRef = useRef(false);

  const langMeta = LANGUAGES_LIST.find(
    (l) =>
      l.name.toLowerCase() === selectedLanguage.toLowerCase() ||
      l.code.toLowerCase() === selectedLanguage.toLowerCase() ||
      l.nativeName.toLowerCase() === selectedLanguage.toLowerCase()
  ) || { code: "en", name: "English", nativeName: "English", speechCode: "en-US" };

  useEffect(() => {
    loadHistory();
  }, [currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      stopAnySpeech();
    };
  }, []);

  const loadHistory = async () => {
    const history = await neurosathiDb.getAiHistory(currentUser.id);
    if (history.length > 0) {
      setMessages(history);
    } else {
      // Friendly initial greeting in chosen language
      const greeting = selectedLanguage.toLowerCase().includes("hindi") || selectedLanguage.toLowerCase().includes("हिन्दी")
        ? "नमस्ते! मैं आपकी सहायता के लिए तैयार हूँ। आप बोलकर या लिखकर कोई भी सवाल पूछ सकते हैं।"
        : "Hello! I am ready to help. You can speak using the mic or type any question anytime.";

      const welcomeMsg: AiChatMessage = {
        id: "welcome-1",
        userId: currentUser.id,
        role: "model",
        message: greeting,
        language: selectedLanguage,
        createdAt: new Date().toISOString(),
      };
      setMessages([welcomeMsg]);
    }
  };

  const stopSpeaking = () => {
    stopAnySpeech();
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  };

  const speakText = (text: string, msgId?: string, customSpeechCode?: string) => {
    stopSpeaking();
    setSpeakingMsgId(msgId || null);

    speakSpeech({
      text,
      preferredVoice: getStoredVoiceName(),
      engine: getStoredVoiceEngine(),
      speechCode: customSpeechCode || langMeta.speechCode || "en-US",
      onStart: () => {
        setIsSpeaking(true);
        setSpeakingMsgId(msgId || null);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      },
    });
  };

  const startListening = async () => {
    setSpeechError(null);
    stopSpeaking();
    hasDispatchedVoicePromptRef.current = false;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        `Voice input is not supported in this browser. Please use Chrome, Edge, or Safari, or type your message.`
      );
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setSpeechError(
        "Microphone permission was denied. Please allow microphone access in your browser settings."
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = langMeta.speechCode || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        playClickSound();
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalStr = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInputText(interim);
        }
        if (finalStr && !hasDispatchedVoicePromptRef.current) {
          hasDispatchedVoicePromptRef.current = true;
          try {
            recognitionRef.current?.stop();
          } catch {}
          setIsListening(false);
          setInputText("");
          // Automatically submit voice message and trigger single voice output
          handleSend(finalStr, true);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError(
            "Microphone permission was denied. Please grant microphone access in browser settings to use voice input."
          );
        } else if (event.error === "network") {
          setSpeechError(
            "Voice input network notice: The speech recognition server was momentarily unreachable. This often happens with ad-blockers, VPNs, or inside an embedded frame. Please tap the mic to retry, or type your message."
          );
        } else if (event.error !== "no-speech") {
          setSpeechError(`Voice notice (${event.error}). Please try tapping the mic again or type your message.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn("Recognition start failed:", e);
      setIsListening(false);
      setSpeechError("Could not start voice recognition. Please try again.");
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
    if (!hasDispatchedVoicePromptRef.current && inputText.trim()) {
      hasDispatchedVoicePromptRef.current = true;
      const textToSubmit = inputText.trim();
      setInputText("");
      handleSend(textToSubmit, true);
    }
  };

  const handleSend = async (textToSend?: string, triggerVoiceOutput?: boolean) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Immediately stop any prior speaking before handling new turn
    stopSpeaking();
    playClickSound();
    setInputText("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      userId: currentUser.id,
      role: "user",
      message: text,
      language: selectedLanguage,
      createdAt: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Call server-side Gemini API
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newHistory.map((m) => ({ role: m.role, text: m.message })),
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
      const replyText = data.reply || "I am always here to assist you. How can I help today?";
      const launchGame = data.launchGame || null;

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

      const resolvedLang = data.resolvedLanguage;
      const finalLangCode = resolvedLang?.resolvedCode || selectedLanguage;
      const finalSpeechCode = resolvedLang?.speechCode || langMeta.speechCode;

      const modelMsg: AiChatMessage = {
        id: `model-${Date.now()}`,
        userId: currentUser.id,
        role: "model",
        message: replyText,
        language: finalLangCode,
        launchGame,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMsg]);
      playSuccessSound();

      // Read output aloud in the resolved language if voice mode or autoSpeak is active
      if (triggerVoiceOutput || autoSpeak) {
        speakText(replyText, modelMsg.id, finalSpeechCode);
      }

      // Persist both messages to Supabase with the resolved language
      await neurosathiDb.saveAiMessage(currentUser.id, "user", userMsg.message, finalLangCode);
      await neurosathiDb.saveAiMessage(currentUser.id, "model", modelMsg.message, finalLangCode, launchGame);

      // If user issued an explicit language change command, propagate preference change to parent
      if (resolvedLang?.shouldUpdatePreference && onLanguageChange && resolvedLang.resolvedCode) {
        onLanguageChange(resolvedLang.resolvedCode);
      }

      // If AI detected a game request, automatically launch it immediately
      if (launchGame && launchGame.id) {
        onLaunchGame(launchGame.id);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: AiChatMessage = {
        id: `err-${Date.now()}`,
        userId: currentUser.id,
        role: "model",
        message: "I had a moment of connection delay, but I am right here. Please try asking again!",
        language: selectedLanguage,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    "मुझे कोई memory game खिलाओ",
    "Let's play Card Matching",
    "How can I keep my mind sharp?",
    "Start Simple Sudoku",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-210px)] min-h-[500px]">
      {/* Header Banner */}
      <div className="bg-white border-2 border-slate-300 rounded-3xl p-4 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#e8fbf6] border-2 border-[#a7f0df] text-[#074738] flex items-center justify-center text-2xl shrink-0">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              NeuroSathi AI Companion
              <span className="text-xs bg-emerald-100 text-emerald-900 font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                Online
              </span>
            </h2>
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>Cognitive Health Assistant</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[#065f46] bg-[#e8fbf6] px-1.5 py-0.5 rounded-md font-black border border-[#a7f0df]">
                <Globe className="w-3 h-3" /> Auto Language Active
              </span>
              <span>•</span>
              <span>Default: <strong className="text-[#074738] font-black">{langMeta.name}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Settings Selector */}
          <button
            id="chat-voice-settings-btn"
            type="button"
            onClick={() => {
              playClickSound();
              setIsVoiceSettingsOpen(true);
            }}
            className="px-3 py-2 rounded-2xl border-2 text-xs font-black flex items-center gap-1.5 transition cursor-pointer bg-[#e8fbf6] border-[#a7f0df] text-[#074738] hover:bg-[#d5f7ed]"
            title="Speech & Voice Settings"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#074738]" />
            <span>Voice Settings</span>
            <Settings className="w-3 h-3 text-[#074738] opacity-70" />
          </button>

          {/* Auto-read speech toggle */}
          <button
            id="chat-auto-read-toggle"
            type="button"
            onClick={() => {
              playClickSound();
              if (isSpeaking) stopSpeaking();
              setAutoSpeak(!autoSpeak);
            }}
            className={`px-3 py-2 rounded-2xl border-2 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              autoSpeak
                ? "bg-[#e8fbf6] border-[#a7f0df] text-[#074738]"
                : "bg-slate-100 border-slate-300 text-slate-600"
            }`}
            title="Automatically read AI replies out loud in the selected language"
          >
            {autoSpeak ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#074738]" />
                <span>Voice Output: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Voice Output: OFF</span>
              </>
            )}
          </button>

          {/* Switch to Fullscreen Voice Mode */}
          <button
            id="chat-switch-to-voice-btn"
            onClick={() => {
              playClickSound();
              stopSpeaking();
              onOpenVoiceModal();
            }}
            className="px-4 py-2 rounded-2xl bg-[#074738] hover:bg-[#043328] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Mic className="w-4 h-4 text-[#a7f0df]" />
            <span>Full Voice Mode</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white border-2 border-slate-300 rounded-3xl p-4 sm:p-6 overflow-y-auto shadow-inner space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white ${
                  isUser ? "bg-slate-800" : "bg-[#074738] shadow-sm"
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-[#a7f0df]" />}
              </div>

              <div
                className={`max-w-[80%] rounded-3xl p-4 sm:p-5 shadow-xs text-base sm:text-lg leading-relaxed font-bold ${
                  isUser
                    ? "bg-[#074738] text-white rounded-tr-xs"
                    : "bg-slate-50 text-slate-900 border-2 border-slate-300 rounded-tl-xs"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.message}</div>

                {/* AI Voice read-out & Game launcher actions */}
                {!isUser && (() => {
                  const msgCap = getLanguageCapability(m.language || selectedLanguage);
                  return (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                      <button
                        id={`chat-speak-btn-${m.id}`}
                        type="button"
                        onClick={() => {
                          if (isSpeaking && speakingMsgId === m.id) {
                            stopSpeaking();
                          } else {
                            speakText(m.message, m.id, msgCap.speechCode);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSpeaking && speakingMsgId === m.id
                            ? "bg-[#074738] text-white animate-pulse"
                            : "bg-white hover:bg-[#e8fbf6] text-slate-800 border border-slate-300 shadow-2xs"
                        }`}
                        title={`Listen in ${msgCap.name} (${msgCap.nativeName})`}
                      >
                        {isSpeaking && speakingMsgId === m.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Speaking</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#074738]" />
                            <span>Listen in {msgCap.name}</span>
                          </>
                        )}
                      </button>

                      {msgCap.code !== "en" && (
                        <span className="text-[11px] font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {msgCap.nativeName}
                        </span>
                      )}

                      {m.launchGame && (
                        <button
                          onClick={() => {
                            playClickSound();
                            stopSpeaking();
                            onLaunchGame(m.launchGame!.id);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Start {m.launchGame.name}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#074738] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-5 h-5 text-[#a7f0df]" />
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-3.5 flex items-center gap-2 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#074738] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#074738] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#074738] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-200 whitespace-nowrap cursor-pointer transition-all"
          >
            💬 {p}
          </button>
        ))}
      </div>

      {/* Listening Banner */}
      {isListening && (
        <div className="mb-2 flex items-center justify-between px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm shadow-xs animate-pulse">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
            <span>
              Listening in <strong className="font-bold">{langMeta.name}</strong> ({langMeta.speechCode})... Speak now
            </span>
          </div>
          <button
            id="chat-mic-done-btn"
            type="button"
            onClick={stopListening}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-2 flex items-center justify-between px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-amber-700 font-bold hover:text-amber-900 ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input Box with Mic right near the input */}
      <div className="mt-1 flex items-center gap-2.5 bg-white p-2.5 rounded-3xl border-2 border-slate-400 focus-within:border-[#074738] shadow-sm transition-all">
        <input
          id="ai-chat-input-field"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            isListening
              ? `Listening in ${langMeta.name}...`
              : `Ask in ${langMeta.name} or tap the mic...`
          }
          className="flex-1 px-4 py-3 bg-transparent text-slate-900 font-bold text-base sm:text-lg focus:outline-none placeholder:text-slate-500"
        />

        {/* Mic Button near the chat bar */}
        <button
          id="chat-mic-bar-btn"
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
            isListening
              ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white ring-4 ring-rose-200 animate-pulse"
              : "bg-[#e8fbf6] hover:bg-[#d1fae5] text-[#074738] border-2 border-[#a7f0df]"
          }`}
          title={
            isListening
              ? "Stop listening and send"
              : `Voice Input in ${langMeta.name} (${langMeta.speechCode})`
          }
          aria-label={isListening ? "Stop listening" : `Record voice in ${langMeta.name}`}
        >
          {isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-[#074738]" />
          )}
        </button>

        {/* Send Button */}
        <button
          id="ai-chat-send-btn"
          type="button"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          className="w-13 h-13 rounded-2xl bg-[#074738] hover:bg-[#043328] disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          aria-label="Send"
        >
          <Send className="w-6 h-6" />
        </button>
      </div>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => {
          setIsVoiceSettingsOpen(false);
          setVoiceEngine(getStoredVoiceEngine());
        }}
        currentLanguage={langMeta.name}
      />
    </div>
  );
};

