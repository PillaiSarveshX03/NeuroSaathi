/**
 * NeuroSathi Centralized Language Router & Detector
 * 
 * Provides:
 * 1. Explicit language command detection (Priority 1)
 * 2. High-precision script and lexical language detection (Priority 2)
 * 3. Confidence checking & ambiguity handling (conservative on short messages)
 * 4. Mixed-language / loan word preservation (e.g., "मेरी progress बताओ")
 * 5. Resolution pipeline adhering to the exact 4-tier language priority
 */

import {
  LANGUAGE_CAPABILITIES,
  LanguageCapability,
  getLanguageCapability,
} from "./languageCapabilities";

export interface LanguageDetectionResult {
  code: string;
  name: string;
  confidence: number; // 0.0 to 1.0
  isReliable: boolean; // confidence >= threshold
  isExplicitChange: boolean;
  isAmbiguous: boolean;
  detectedVia: "explicit_command" | "script_analysis" | "lexical_analysis" | "hinglish_pattern" | "fallback";
  rawText: string;
}

export interface ResolvedLanguageResult {
  resolvedCode: string;
  resolvedName: string;
  speechCode: string;
  confidence: number;
  isExplicitChange: boolean;
  shouldUpdatePreference: boolean;
  tier: "direct" | "translation" | "limited" | "none";
  detection: LanguageDetectionResult;
  promptDirective: string;
}

export interface LanguageRouterContext {
  selectedLanguage?: string;
  preferredLanguage?: string;
  previousLanguage?: string;
  history?: Array<{ role: string; text: string }>;
}

// Common short greeting/affirmation tokens that should NOT trigger a language preference override
const SHORT_AMBIGUOUS_TOKENS = new Set([
  "hi", "hello", "hey", "hola", "ok", "okay", "yes", "no", "yeah", "yep", "nope",
  "hmm", "hmmm", "thanks", "thank you", "bye", "good", "fine", "sure", "alright",
  "हाँ", "हा", "ना", "नहीं", "ठीक", "अच्छा", "नमस्ते", "धन्यवाद", "शुक्रिया",
  "হাঁ", "ঠিক", "নমস্কাৰ", "ধন্যবাদ"
]);

// Common English loanwords used frequently in Indian conversations that must not mistakenly switch an Indic query to English
const COMMON_LOAN_WORDS = new Set([
  "game", "games", "doctor", "progress", "ai", "mobile", "medicine", "reminder",
  "memory", "score", "brain", "sudoku", "card", "hospital", "phone", "check",
  "test", "play", "start", "time", "help", "alert", "emergency", "sos", "call"
]);

// High-frequency romanized Hindi (Hinglish) tokens
const HINGLISH_TOKENS = new Set([
  "kya", "kaise", "kaisa", "hai", "hain", "ho", "hu", "hoon", "mujhe", "mera", "meri",
  "mere", "batao", "bataiye", "karo", "kijiye", "dawai", "khelna", "khelo", "naam",
  "aaj", "kal", "pani", "dost", "aap", "tum", "hum", "sab", "shukriya", "dhanyawad",
  "sunao", "suno", "kuch", "accha", "theek", "doctor", "yaad", "kaun", "kahan", "kitna",
  "mein", "me", "se", "ko", "par", "pe", "aur", "bhi", "toh", "to", "nahi", "nahin"
]);

// Explicit language command patterns
interface ExplicitLanguageMatch {
  regex: RegExp;
  targetCode: string;
}

const EXPLICIT_LANGUAGE_PATTERNS: ExplicitLanguageMatch[] = [
  // English commands
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+hindi/i, targetCode: "hi" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+english/i, targetCode: "en" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+marathi/i, targetCode: "mr" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+bhojpuri/i, targetCode: "bho" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+maithili/i, targetCode: "mai" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+sanskrit/i, targetCode: "sa" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+konkani/i, targetCode: "kok" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+nepali/i, targetCode: "ne" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+assamese/i, targetCode: "as" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+bengali/i, targetCode: "bn" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+gujarati/i, targetCode: "gu" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+tamil/i, targetCode: "ta" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+telugu/i, targetCode: "te" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+kannada/i, targetCode: "kn" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+malayalam/i, targetCode: "ml" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+punjabi/i, targetCode: "pa" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+odia/i, targetCode: "or" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+urdu/i, targetCode: "ur" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+spanish/i, targetCode: "es" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+french/i, targetCode: "fr" },
  { regex: /(?:answer|reply|respond|talk|speak|chat)\s+(?:me\s+)?(?:in|using)\s+german/i, targetCode: "de" },
  { regex: /(?:change|switch|set)\s+(?:the\s+)?language\s+to\s+([a-zA-Z]+)/i, targetCode: "DYNAMIC" },

  // Hindi / Devanagari commands
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:अंग्रेजी|अंग्रेज़ी|english)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "en" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:हिंदी|हिन्दी)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "hi" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:मराठी)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "mr" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:भोजपुरी)\s+में\s+(?:जवाब|उत्तर|बात|बोलो|सुनाओ)/i, targetCode: "bho" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:मैथिली)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "mai" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:संस्कृत)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "sa" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:नेपाली)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "ne" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:गुजराती)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "gu" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:बंगाली|बाङ्ला)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "bn" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:असमिया|অসমীয়া)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "as" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:तमिल)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "ta" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:तेलुगु)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "te" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:कन्नड़)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "kn" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:मलयालम)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "ml" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:पंजाबी)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "pa" },
  { regex: /(?:मुझे\s+)?(?:अब\s+)?(?:उर्दू)\s+में\s+(?:जवाब|उत्तर|बात|बोलो)/i, targetCode: "ur" },

  // Regional language native commands
  { regex: /(?:हमरा\s+के\s+)?(?:भोजपुरी)\s+में\s+(?:बताईं|सुनाईं|बात\s+करीं)/i, targetCode: "bho" },
  { regex: /मराठीत\s+(?:उत्तर|बोला|सांगा)/i, targetCode: "mr" },

  // Assamese & Bengali commands
  { regex: /অসমীয়াত\s+(?:উত্তৰ|কথা|কওক|দিয়ক)/i, targetCode: "as" },
  { regex: /বাংলায়\s+(?:উত্তর|কথা|বলুন|দিন)/i, targetCode: "bn" },
  { regex: /ইংৰাজীত\s+(?:উত্তৰ|কথা|কওক)/i, targetCode: "en" },
  { regex: /ইংরেজিতে\s+(?:উত্তর|কথা|বলুন)/i, targetCode: "en" },

  // Tamil & Telugu commands
  { regex: /தமிழில்\s+(?:பதில்|பேசு|கூறு)/i, targetCode: "ta" },
  { regex: /తెలుగులో\s+(?:సమాధానం|మాట్లాడు)/i, targetCode: "te" },
];

/**
 * Checks for explicit language switch requests in the input
 */
function checkExplicitLanguageCommand(text: string): { matched: boolean; targetCode?: string } {
  const clean = text.trim();

  for (const item of EXPLICIT_LANGUAGE_PATTERNS) {
    const match = clean.match(item.regex);
    if (match) {
      if (item.targetCode === "DYNAMIC" && match[1]) {
        const capability = getLanguageCapability(match[1]);
        return { matched: true, targetCode: capability.code };
      }
      return { matched: true, targetCode: item.targetCode };
    }
  }

  return { matched: false };
}

/**
 * Inspects character code points against standard Unicode script blocks
 */
function analyzeScripts(text: string) {
  let devanagari = 0;
  let bengaliAssamese = 0;
  let gurmukhi = 0;
  let gujarati = 0;
  let odia = 0;
  let tamil = 0;
  let telugu = 0;
  let kannada = 0;
  let malayalam = 0;
  let arabic = 0;
  let latin = 0;
  let cjk = 0;
  let hangul = 0;
  let thai = 0;
  let cyrillic = 0;
  let greek = 0;
  let hebrew = 0;
  let totalLetters = 0;

  // Assamese specific characters
  let assameseSpecific = 0; // ৰ (\u09F0), ৱ (\u09F1)
  let bengaliSpecific = 0;  // র (\u09B0), ব (\u09AC)

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // Skip spaces, digits, punctuation
    if (code <= 64 || (code >= 91 && code <= 96) || (code >= 123 && code <= 191)) {
      continue;
    }

    totalLetters++;

    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 192 && code <= 0x024F)) {
      latin++;
    } else if (code >= 0x0900 && code <= 0x097F) {
      devanagari++;
    } else if (code >= 0x0980 && code <= 0x09FF) {
      bengaliAssamese++;
      if (code === 0x09F0 || code === 0x09F1) {
        assameseSpecific++;
      } else if (code === 0x09B0 || code === 0x09AC) {
        bengaliSpecific++;
      }
    } else if (code >= 0x0A00 && code <= 0x0A7F) {
      gurmukhi++;
    } else if (code >= 0x0A80 && code <= 0x0AFF) {
      gujarati++;
    } else if (code >= 0x0B00 && code <= 0x0B7F) {
      odia++;
    } else if (code >= 0x0B80 && code <= 0x0BFF) {
      tamil++;
    } else if (code >= 0x0C00 && code <= 0x0C7F) {
      telugu++;
    } else if (code >= 0x0C80 && code <= 0x0CFF) {
      kannada++;
    } else if (code >= 0x0D00 && code <= 0x0D7F) {
      malayalam++;
    } else if (code >= 0x0600 && code <= 0x06FF) {
      arabic++;
    } else if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3040 && code <= 0x30FF)) {
      cjk++;
    } else if (code >= 0xAC00 && code <= 0xD7AF) {
      hangul++;
    } else if (code >= 0x0E00 && code <= 0x0E7F) {
      thai++;
    } else if (code >= 0x0400 && code <= 0x04FF) {
      cyrillic++;
    } else if (code >= 0x0370 && code <= 0x03FF) {
      greek++;
    } else if (code >= 0x0590 && code <= 0x05FF) {
      hebrew++;
    }
  }

  return {
    totalLetters,
    devanagari,
    bengaliAssamese,
    assameseSpecific,
    bengaliSpecific,
    gurmukhi,
    gujarati,
    odia,
    tamil,
    telugu,
    kannada,
    malayalam,
    arabic,
    latin,
    cjk,
    hangul,
    thai,
    cyrillic,
    greek,
    hebrew,
  };
}

/**
 * Detect language of a given text message with confidence check and loanword safety
 */
export function detectLanguage(text: string, context?: LanguageRouterContext): LanguageDetectionResult {
  const trimmed = text.trim();

  // Handle empty input safely
  if (!trimmed) {
    const fallback = context?.selectedLanguage || "en";
    const cap = getLanguageCapability(fallback);
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0,
      isReliable: false,
      isExplicitChange: false,
      isAmbiguous: true,
      detectedVia: "fallback",
      rawText: text,
    };
  }

  // 1. Explicit Language Change Command (Priority 1)
  const explicit = checkExplicitLanguageCommand(trimmed);
  if (explicit.matched && explicit.targetCode) {
    const cap = getLanguageCapability(explicit.targetCode);
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.99,
      isReliable: true,
      isExplicitChange: true,
      isAmbiguous: false,
      detectedVia: "explicit_command",
      rawText: text,
    };
  }

  // Check for short ambiguous messages or pure loanword queries (e.g. "Start Sudoku", "Game", "Doctor", "Reminders")
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const isShort = words.length <= 2 && trimmed.length <= 15;
  const isAllAmbiguous = words.every((w) => SHORT_AMBIGUOUS_TOKENS.has(w.replace(/[.,!?]/g, "")));
  const isAllLoanWords = words.length <= 2 && words.every((w) => {
    const clean = w.replace(/[^a-z]/g, "");
    return COMMON_LOAN_WORDS.has(clean) || SHORT_AMBIGUOUS_TOKENS.has(clean);
  });

  if ((isShort && isAllAmbiguous) || isAllLoanWords) {
    const currentCode = context?.selectedLanguage || context?.previousLanguage || "en";
    const cap = getLanguageCapability(currentCode);
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.35, // Deliberately low confidence so it keeps the previous/selected language
      isReliable: false,
      isExplicitChange: false,
      isAmbiguous: true,
      detectedVia: "fallback",
      rawText: text,
    };
  }

  // 2. Script Analysis (Priority 2)
  const scriptCounts = analyzeScripts(trimmed);
  const total = scriptCounts.totalLetters || 1;

  // Devanagari script (Hindi, Marathi, Bhojpuri, Maithili, Sanskrit, Konkani, Nepali, etc.)
  if (scriptCounts.devanagari > 0 && scriptCounts.devanagari / total >= 0.25) {
    // Bhojpuri markers (हमरा, हमार, हमनी, रउवा, रउआ, तोहार, तोहके, सुनाईं, सुनाव, कइल, गइल, भइल, बानी, बाटे, बा, खेलेम, काहे, केहू, बड़ी, ठीक बा, बताईं, बुझात, कैसन, ल्हिका, खातिर, कहब, करब)
    const hasBhojpuriMarker = /(?:हमरा|हमार|हमनी|रउवा|रउआ|तोहार|तोहके|सुनाईं|सुनाव|सुनावा|कइल|गइल|भइल|बानी|बाटे|\bबा\b|खेलेम|काहे|केहू|बड़ी|ठीक बा|बताईं|बुझात|कैसन|ल्हिका|खातिर|कहब|करब|सुनाई)/.test(trimmed);

    // Marathi specific markers (ळ, आहे, नाही, करा, मला, कसा, कसे, माझे, माझं, काय, करायचं, करायचे, सांगा, गोष्ट, ऐकवा, कसं, झाले, होते, होता, खेळ, खेळूया, तुला, तुम्हाला, आपण, कधी, कुठे, नको, चांगले, बघ, पाहिजे)
    const hasMarathiMarker = /[ळ]|(?:आहे|नाही|करा|मला|कसा|कसे|माझे|माझं|काय|करायचं|करायचे|सांगा|गोष्ट|ऐकवा|कसं|झाले|होते|होता|खेळ|खेळूया|तुला|तुम्हाला|आपण|कधी|कुठे|नको|चांगले|बघ|पाहिजे)/.test(trimmed);

    // Maithili specific markers (अहाँ, अहां, अछि, छै, छैक, कहलहुं, सुनाउ, कहू, की हाल, कथी, गेल, भेल, कएल, भेलहुं)
    const hasMaithiliMarker = /(?:अहाँ|अहां|अछि|छै|छैक|कहलहुं|सुनाउ|कहू|की हाल|कथी|गेल|भेल|कएल|भेलहुं)/.test(trimmed);

    // Sanskrit specific markers (अहम्, त्वम्, भवन्तः, भवति, अस्ति, श्रावयतु, वदतु, नमस्ते, कथम्, शुभम्, धन्यवादः, करोतु)
    const hasSanskritMarker = /(?:अहम्|त्वम्|भवन्तः|भवति|अस्ति|श्रावयतु|वदतु|नमस्ते|कथम्|शुभम्|धन्यवादः|करोतु)/.test(trimmed);

    // Konkani specific markers (हांव, तुका, आसा, किदें, सांग, बरो, बरे, उलोवंक)
    const hasKonkaniMarker = /(?:हांव|तुका|आसा|किदें|सांग|उलोवंक)/.test(trimmed);

    // Nepali specific markers (छ, छन्, गर्छ, भएको, मेरो, हामी, कस्तो, कस्ता, राम्रो, हुनुहुन्छ, गर्नुहोस्, सुनाउनुहोस्)
    const hasNepaliMarker = /(?:छ|छन्|गर्छ|भएको|मेरो|हामी|कस्तो|कस्ता|राम्रो|हुनुहुन्छ|गर्नुहोस्|सुनाउनुहोस्)/.test(trimmed);

    // Hindi specific markers
    const hasHindiMarker = /(?:है|हैं|क्या|मुझे|बताओ|सुनाओ|कहो|मेरा|मेरी|मेरे|आप|हम|कैसे|कैसा|दिखाओ|खिलाओ|दवाई)/.test(trimmed);

    let code = "hi";
    if (hasBhojpuriMarker) {
      code = "bho";
    } else if (hasMarathiMarker && !hasHindiMarker) {
      code = "mr";
    } else if (hasMaithiliMarker) {
      code = "mai";
    } else if (hasSanskritMarker) {
      code = "sa";
    } else if (hasKonkaniMarker) {
      code = "kok";
    } else if (hasNepaliMarker && !hasHindiMarker) {
      code = "ne";
    } else if (hasMarathiMarker) {
      code = "mr";
    }

    const cap = getLanguageCapability(code);
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.95,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Bengali / Assamese script
  if (scriptCounts.bengaliAssamese > 0 && scriptCounts.bengaliAssamese / total >= 0.25) {
    // Check for Assamese markers (ৰ, ৱ, and Assamese specific vocabulary like মোক, কওক, সাধু, এটা, etc.)
    const hasAssameseMarkers =
      scriptCounts.assameseSpecific > 0 ||
      /(?:অসমীয়া|উত্তৰ|কৰক|দিয়ক|মোৰ|ভাল|কেনেকৈ|আছে|মোক|কওক|সাধু|এটা|আপুনি|মই|তুমি|হয়|নহয়)/.test(trimmed);

    const code = hasAssameseMarkers ? "as" : "bn";
    const cap = getLanguageCapability(code);
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.94,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Gurmukhi (Punjabi)
  if (scriptCounts.gurmukhi > 0 && scriptCounts.gurmukhi / total >= 0.25) {
    const cap = getLanguageCapability("pa");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Gujarati
  if (scriptCounts.gujarati > 0 && scriptCounts.gujarati / total >= 0.25) {
    const cap = getLanguageCapability("gu");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Odia
  if (scriptCounts.odia > 0 && scriptCounts.odia / total >= 0.25) {
    const cap = getLanguageCapability("or");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Tamil
  if (scriptCounts.tamil > 0 && scriptCounts.tamil / total >= 0.25) {
    const cap = getLanguageCapability("ta");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Telugu
  if (scriptCounts.telugu > 0 && scriptCounts.telugu / total >= 0.25) {
    const cap = getLanguageCapability("te");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Kannada
  if (scriptCounts.kannada > 0 && scriptCounts.kannada / total >= 0.25) {
    const cap = getLanguageCapability("kn");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Malayalam
  if (scriptCounts.malayalam > 0 && scriptCounts.malayalam / total >= 0.25) {
    const cap = getLanguageCapability("ml");
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.96,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // Arabic / Urdu
  if (scriptCounts.arabic > 0 && scriptCounts.arabic / total >= 0.25) {
    // Urdu markers vs Arabic
    const isUrdu = /(?:ہے|ہیں|کیا|مجھے|بتائیں|شکریہ|میرا|میری)/.test(trimmed);
    const code = isUrdu ? "ur" : "ar";
    const cap = getLanguageCapability(code);
    return {
      code: cap.code,
      name: cap.name,
      confidence: 0.95,
      isReliable: true,
      isExplicitChange: false,
      isAmbiguous: false,
      detectedVia: "script_analysis",
      rawText: text,
    };
  }

  // CJK, Cyrillic, Greek, Hebrew, Thai
  if (scriptCounts.hangul > 0) {
    const cap = getLanguageCapability("ko");
    return { code: cap.code, name: cap.name, confidence: 0.96, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "script_analysis", rawText: text };
  }
  if (scriptCounts.cjk > 0) {
    const hasKana = /[\u3040-\u30FF]/.test(trimmed);
    const code = hasKana ? "ja" : "zh-CN";
    const cap = getLanguageCapability(code);
    return { code: cap.code, name: cap.name, confidence: 0.95, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "script_analysis", rawText: text };
  }
  if (scriptCounts.thai > 0) {
    const cap = getLanguageCapability("th");
    return { code: cap.code, name: cap.name, confidence: 0.96, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "script_analysis", rawText: text };
  }
  if (scriptCounts.cyrillic > 0) {
    const cap = getLanguageCapability("ru");
    return { code: cap.code, name: cap.name, confidence: 0.94, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "script_analysis", rawText: text };
  }
  if (scriptCounts.greek > 0) {
    const cap = getLanguageCapability("el");
    return { code: cap.code, name: cap.name, confidence: 0.96, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "script_analysis", rawText: text };
  }
  if (scriptCounts.hebrew > 0) {
    const cap = getLanguageCapability("he");
    return { code: cap.code, name: cap.name, confidence: 0.96, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "script_analysis", rawText: text };
  }

  // 3. Latin Script Analysis (English, Hinglish, Spanish, French, German, etc.)
  if (scriptCounts.latin > 0) {
    // Check for Hinglish tokens:
    // e.g., "Hindi mein ek story sunao", "Please meri progress batao", "kya haal hai"
    let hinglishCount = 0;
    let nonLoanWordCount = 0;

    for (const rawWord of words) {
      const cleanWord = rawWord.replace(/[^a-z]/g, "");
      if (!cleanWord) continue;

      if (COMMON_LOAN_WORDS.has(cleanWord)) {
        continue; // Loan words do not count as English signals against Hinglish
      }

      nonLoanWordCount++;

      if (HINGLISH_TOKENS.has(cleanWord)) {
        hinglishCount++;
      }
    }

    // Romanized Bhojpuri check
    if (/\b(?:humra|humar|humani|rauwa|raua|tohar|tohke|sunai|sunao|kail|gail|bhail|baani|bate|theek ba|kaisan|kaise ba|ka haal ba)\b/i.test(trimmed)) {
      const cap = getLanguageCapability("bho");
      return {
        code: cap.code,
        name: cap.name,
        confidence: 0.90,
        isReliable: true,
        isExplicitChange: false,
        isAmbiguous: false,
        detectedVia: "lexical_analysis",
        rawText: text,
      };
    }

    // Romanized Marathi check
    if (/\b(?:mala|aahe|ahe|nahit|nahi|kara|kasa|kase|majhe|maza|kaay|kay|karaycha|sanga|goshta|kheluya|tula|tumhala)\b/i.test(trimmed)) {
      const cap = getLanguageCapability("mr");
      return {
        code: cap.code,
        name: cap.name,
        confidence: 0.90,
        isReliable: true,
        isExplicitChange: false,
        isAmbiguous: false,
        detectedVia: "lexical_analysis",
        rawText: text,
      };
    }

    if (hinglishCount >= 2 || (hinglishCount >= 1 && nonLoanWordCount <= 3)) {
      const cap = getLanguageCapability("hi");
      return {
        code: cap.code,
        name: cap.name,
        confidence: 0.88,
        isReliable: true,
        isExplicitChange: false,
        isAmbiguous: false,
        detectedVia: "hinglish_pattern",
        rawText: text,
      };
    }

    // European language specific patterns (Spanish, French, German)
    const lower = trimmed.toLowerCase();
    if (/(?:¿|¡|\b(?:hola|gracias|por favor|cómo estás|buenos días|amigo)\b)/.test(lower)) {
      const cap = getLanguageCapability("es");
      return { code: cap.code, name: cap.name, confidence: 0.92, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "lexical_analysis", rawText: text };
    }
    if (/\b(?:bonjour|merci|s'il vous plaît|comment|très bien)\b/.test(lower)) {
      const cap = getLanguageCapability("fr");
      return { code: cap.code, name: cap.name, confidence: 0.92, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "lexical_analysis", rawText: text };
    }
    if (/\b(?:guten tag|danke|bitte|wie geht|ich bin)\b/.test(lower)) {
      const cap = getLanguageCapability("de");
      return { code: cap.code, name: cap.name, confidence: 0.92, isReliable: true, isExplicitChange: false, isAmbiguous: false, detectedVia: "lexical_analysis", rawText: text };
    }

    // Default to English for general Latin text
    // If the message has enough words to be confident
    const isReliableEnglish = words.length >= 2 || /^(?:what|how|tell|show|start|play|help|who|when|where|why|can|please)\b/i.test(trimmed);
    const cap = getLanguageCapability("en");
    return {
      code: cap.code,
      name: cap.name,
      confidence: isReliableEnglish ? 0.92 : 0.65,
      isReliable: isReliableEnglish,
      isExplicitChange: false,
      isAmbiguous: !isReliableEnglish,
      detectedVia: "lexical_analysis",
      rawText: text,
    };
  }

  // Fallback to active/selected language
  const fallbackCode = context?.selectedLanguage || context?.previousLanguage || "en";
  const cap = getLanguageCapability(fallbackCode);
  return {
    code: cap.code,
    name: cap.name,
    confidence: 0.5,
    isReliable: false,
    isExplicitChange: false,
    isAmbiguous: true,
    detectedVia: "fallback",
    rawText: text,
  };
}

/**
 * Resolves the final language for Gemini response following the 4-tier priority:
 * Priority 1: Explicit language change command (e.g. "Answer me in Hindi", "Reply in English", "অসমীয়াত উত্তৰ দিয়ক")
 * Priority 2: Reliably detected language of current user message (confidence >= 0.75)
 * Priority 3: Previously selected / saved user language
 * Priority 4: Safe fallback (English / "en")
 */
export function resolveResponseLanguage(params: {
  text: string;
  selectedLanguage?: string;
  preferredLanguage?: string;
  previousLanguage?: string;
  history?: Array<{ role: string; text: string }>;
  isExplicitSelection?: boolean;
}): ResolvedLanguageResult {
  const { text, selectedLanguage, preferredLanguage, previousLanguage, history, isExplicitSelection } = params;

  // Run centralized detection on the input
  const detection = detectLanguage(text, {
    selectedLanguage,
    preferredLanguage,
    previousLanguage,
    history,
  });

  let resolvedCapability: LanguageCapability;
  let shouldUpdatePreference = false;

  // PRIORITY 1: Explicit language change command
  if (detection.isExplicitChange) {
    resolvedCapability = getLanguageCapability(detection.code);
    shouldUpdatePreference = true;
  }
  // PRIORITY 2: Reliably detected language of THIS message
  else if (detection.isReliable && detection.confidence >= 0.70) {
    resolvedCapability = getLanguageCapability(detection.code);
    // Dynamic message turn adaptation
    shouldUpdatePreference = false;
  }
  // PRIORITY 3: Explicitly chosen UI selector language (when user made explicit choice)
  else if (selectedLanguage && isExplicitSelection) {
    resolvedCapability = getLanguageCapability(selectedLanguage);
  }
  // PRIORITY 4: Conversation context / previous language
  else if (previousLanguage) {
    resolvedCapability = getLanguageCapability(previousLanguage);
  } else if (preferredLanguage) {
    resolvedCapability = getLanguageCapability(preferredLanguage);
  } else if (selectedLanguage) {
    resolvedCapability = getLanguageCapability(selectedLanguage);
  }
  // PRIORITY 5: Safe detection capability
  else {
    resolvedCapability = getLanguageCapability(detection.code || "en");
  }

  // Dynamic system instruction directive strictly following universal detection rules
  const promptDirective = `Automatically detect the language and script of the user's latest message. Understand the user's meaning in that language. Respond naturally in ${resolvedCapability.name} (${resolvedCapability.nativeName}) using its proper script unless the user explicitly requests another language. Never switch to English merely because the language is less common. Never switch to Hindi merely because the input is an Indian language. Preserve conversation context while dynamically adapting to language changes. Do not expose internal language-detection or routing information to the user.`;

  return {
    resolvedCode: resolvedCapability.code,
    resolvedName: resolvedCapability.name,
    speechCode: resolvedCapability.speechCode,
    confidence: detection.confidence,
    isExplicitChange: detection.isExplicitChange,
    shouldUpdatePreference,
    tier: resolvedCapability.tier,
    detection,
    promptDirective,
  };
}

/**
 * Checks whether this resolution qualifies to update the user's persistent profile preference
 */
export function shouldUpdatePreference(resolved: ResolvedLanguageResult): boolean {
  return resolved.shouldUpdatePreference && resolved.isExplicitChange;
}
