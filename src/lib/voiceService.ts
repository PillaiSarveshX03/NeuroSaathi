/**
 * Web Speech API Voice & Speech Synthesis Service
 * Provides elder-tuned, natural browser speech output using window.speechSynthesis
 * with zero external TTS model dependencies and strict single-voice output.
 */

export type VoiceEngine = "browser";
export type VoiceName = string;
export type GeminiVoiceName = VoiceName;

export interface VoiceOption {
  id: string;
  name: string;
  tone: string;
  description: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "browser_natural",
    name: "Natural Web Voice",
    tone: "Gentle & Clear",
    description: "Built-in natural browser voice synthesized with elder-tuned pacing.",
  },
];

export const GEMINI_VOICES = VOICE_OPTIONS;

const PREF_KEY_SPEED = "neurosathi_speech_rate";

export function getStoredSpeechRate(): number {
  if (typeof window === "undefined") return 0.92;
  try {
    const saved = localStorage.getItem(PREF_KEY_SPEED);
    if (saved) {
      const num = parseFloat(saved);
      if (!isNaN(num) && num >= 0.7 && num <= 1.3) return num;
    }
  } catch {}
  return 0.92;
}

export function setStoredSpeechRate(rate: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREF_KEY_SPEED, rate.toString());
  } catch {}
}

export function getStoredVoiceEngine(): VoiceEngine {
  return "browser";
}

export function setStoredVoiceEngine(_engine: any): void {
  // Locked to native browser Web Speech API
}

export function getStoredVoiceName(): VoiceName {
  return "Natural Web Voice";
}

export function setStoredVoiceName(_voice: any): void {
  // Locked to native browser Web Speech API
}

export const getStoredGeminiVoice = getStoredVoiceName;
export const setStoredGeminiVoice = setStoredVoiceName;

// Strip markdown characters and noisy symbols before sending to TTS
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italics
    .replace(/__(.*?)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/#{1,6}\s+/g, "") // headers
    .replace(/[-*•]\s+/g, "") // bullet points
    .replace(/>\s+/g, "") // blockquotes
    .replace(/[✨🩺🧠💊⚠️📞🔔👋]/gu, "") // common decorative emojis
    .trim();
}

/**
 * Backward compatibility helper
 */
export function pcmToWavBlob(base64Data: string, sampleRate = 24000): Blob {
  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const pcmBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      pcmBytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([pcmBytes], { type: "audio/wav" });
  } catch {
    return new Blob([], { type: "audio/wav" });
  }
}

// Active playback session ID for guaranteed mutual exclusivity and cancellation
let activePlaybackSessionId = 0;
let isCurrentlySpeaking = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveInterval: any = null;

function clearKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

/**
 * Stop any currently active speech synthesis immediately.
 * Cancels window.speechSynthesis and invalidates all pending callbacks.
 */
export function stopAnySpeech(): void {
  activePlaybackSessionId++;
  clearKeepAlive();

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  if (currentUtterance) {
    currentUtterance.onstart = null;
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
    currentUtterance = null;
  }

  isCurrentlySpeaking = false;
}

export function isSpeakingNow(): boolean {
  return isCurrentlySpeaking;
}

export interface SpeakOptions {
  text: string;
  preferredVoice?: string;
  languageCode?: string;
  speechCode?: string;
  engine?: VoiceEngine;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Speak text using the browser Web Speech API (window.speechSynthesis).
 * - Enforces exactly ONE voice for each response.
 * - Stops and cancels previous utterances before speaking.
 * - Respects the resolved target language speechCode (e.g., 'hi-IN', 'en-US', 'ta-IN').
 * - Selects high-quality natural voices when available.
 */
export async function speakSpeech(options: SpeakOptions): Promise<void> {
  const {
    text,
    speechCode = "en-US",
    rate = getStoredSpeechRate(),
    pitch = 0.98,
    onStart,
    onEnd,
    onError,
  } = options;

  // Stop any previous speech immediately
  stopAnySpeech();

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    if (onEnd) onEnd();
    return;
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Web Speech API (speechSynthesis) is not supported in this browser.");
    if (onEnd) onEnd();
    return;
  }

  const thisSessionId = activePlaybackSessionId;

  try {
    // Unconditionally cancel previous browser utterances to prevent queue buildup
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    currentUtterance = utterance;
    utterance.lang = speechCode;
    utterance.rate = rate; // Elder-friendly pacing
    utterance.pitch = pitch;

    // Pick best natural voice matching the target speechCode
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetPrefix = speechCode.toLowerCase().split("-")[0];
      const matchingVoices = voices.filter(
        (v) =>
          v.lang.toLowerCase() === speechCode.toLowerCase() ||
          v.lang.toLowerCase().replace("_", "-") === speechCode.toLowerCase() ||
          v.lang.toLowerCase().startsWith(targetPrefix)
      );

      // Prioritize natural, online, or Google high-quality voices
      const naturalVoice = matchingVoices.find(
        (v) =>
          v.name.toLowerCase().includes("natural") ||
          v.name.toLowerCase().includes("online") ||
          v.name.toLowerCase().includes("google")
      );

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      } else if (matchingVoices.length > 0) {
        utterance.voice = matchingVoices[0];
      }
    }

    utterance.onstart = () => {
      if (thisSessionId !== activePlaybackSessionId) {
        window.speechSynthesis.cancel();
        return;
      }
      isCurrentlySpeaking = true;
      if (onStart) onStart();

      // Chrome keepalive: prevents synthesis pausing prematurely on long texts
      clearKeepAlive();
      keepAliveInterval = setInterval(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearKeepAlive();
          }
        }
      }, 10000);
    };

    utterance.onend = () => {
      clearKeepAlive();
      if (thisSessionId === activePlaybackSessionId) {
        isCurrentlySpeaking = false;
        currentUtterance = null;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (e) => {
      clearKeepAlive();
      if (thisSessionId === activePlaybackSessionId) {
        isCurrentlySpeaking = false;
        currentUtterance = null;
        if (onError) onError(e);
        else if (onEnd) onEnd();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    clearKeepAlive();
    isCurrentlySpeaking = false;
    currentUtterance = null;
    if (onError) onError(err);
    else if (onEnd) onEnd();
  }
}
