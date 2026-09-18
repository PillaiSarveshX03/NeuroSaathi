import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  runAgentConversation,
  ALL_COGNITIVE_GAMES,
  NEUROSATHI_AGENT_TOOLS,
  serverSupabase,
  isUuid,
} from "./server/agent";
import { resolveResponseLanguage } from "./src/lib/languageRouter";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI client
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    supabaseConnected: Boolean(serverSupabase),
    timestamp: new Date().toISOString(),
  });
});

// List games endpoint
app.get("/api/games", (req, res) => {
  res.json({ games: Object.values(ALL_COGNITIVE_GAMES) });
});

// List agent tools endpoint
app.get("/api/tools", (req, res) => {
  res.json({
    tools: NEUROSATHI_AGENT_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
});

// Gemini AI Chat & Agent endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
      language = "English",
      userRole = "patient",
      userName = "Friend",
      userId,
      userContext,
      isExplicitSelection,
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "A message string is required." });
    }

    // Resolve language through centralized Language Router
    const resolvedLang = resolveResponseLanguage({
      text: message,
      selectedLanguage: language,
      preferredLanguage: userContext?.preferredLanguage,
      history,
      isExplicitSelection,
    });

    const ai = getGenAI();

    // If Gemini key is missing, return natural, context-aware fallback in resolved language
    if (!ai) {
      const lower = (message || "").toLowerCase().trim();
      const lCode = (resolvedLang.resolvedCode || "en").toLowerCase();

      let fallbackReply = "I am listening closely. How can I help you today?";
      if (lower.includes("weather") || lower.includes("मौसम") || lower.includes("हवामान")) {
        fallbackReply = lCode === "hi"
          ? "यहाँ का मौसम सामान्य और सुहावना है, तापमान लगभग 28°C है।"
          : "The weather is pleasant and clear today with moderate temperatures.";
      } else if (lower.includes("knee") || lower.includes("pain") || lower.includes("दर्द") || lower.includes("दुख")) {
        fallbackReply = lCode === "hi"
          ? "मुझे आपके दर्द के बारे में जानकर चिंता हुई। कृपया आराम से बैठें और घुटने पर ज़्यादा ज़ोर न दें। यदि दर्द बना रहे, तो डॉक्टर से परामर्श लें।"
          : "I am sorry to hear you are feeling pain. Please sit comfortably, rest the joint, and avoid putting pressure on it.";
      } else if (lower.includes("eat") || lower.includes("food") || lower.includes("खाना") || lower.includes("भोजन")) {
        fallbackReply = lCode === "hi"
          ? "हल्का और सुपाच्य भोजन लें, जैसे मूंग दाल की खिचड़ी, दलिया या गरम सूप। साथ ही पर्याप्त पानी पिएं।"
          : "Light and nourishing foods like warm vegetable soup, steamed lentils, or oatmeal are gentle and healthy.";
      } else if (lower.includes("story") || lower.includes("कहानी") || lower.includes("गोष्ट")) {
        fallbackReply = lCode === "hi"
          ? "एक बार की बात है, एक शांत और सुंदर गाँव में एक विशाल बरगद का पेड़ था जहाँ सभी पक्षी सुबह मधुर गीत गाते थे..."
          : "Once upon a time in a peaceful village surrounded by green hills, birds gathered each morning to sing melodies of serenity...";
      } else if (/^(hello|hi|hey|namaste|namaskar|pranam|नमस्ते|नमस्कार|प्रणाम)/i.test(lower)) {
        fallbackReply = lCode === "hi"
          ? "नमस्ते! मैं आपकी किस प्रकार सहायता कर सकता हूँ?"
          : "Hello! How can I help you today?";
      } else if (lCode === "hi") {
        fallbackReply = "मैं आपकी बात ध्यान से सुन रहा हूँ। कृपया बताएं, मैं आपकी किस प्रकार मदद कर सकता हूँ?";
      } else if (lCode === "mr") {
        fallbackReply = "मी ऐकत आहे. कृपया सांगा, मी तुम्हाला कशी मदत करू शकतो?";
      } else if (lCode === "bho") {
        fallbackReply = "हम रउवा बात ध्यान से सुनत बानी। बताईं, हम कइसे मदद कर सकीं?";
      }

      return res.json({
        reply: fallbackReply,
        launchGame: null,
        simulated: true,
        resolvedLanguage: resolvedLang,
      });
    }

    // Run the agentic Gemini conversation with tool reasoning
    const agentResult = await runAgentConversation(ai, {
      message,
      history,
      language,
      userName,
      userRole,
      userId,
      userContext,
      resolvedLanguageResult: resolvedLang,
    });

    const finalResolvedCode =
      agentResult.resolvedLanguage?.resolvedCode || resolvedLang.resolvedCode || "en";

    // If user issued an explicit language change command, persist preference to Supabase profiles
    if (
      serverSupabase &&
      userId &&
      isUuid(userId) &&
      (resolvedLang.shouldUpdatePreference || agentResult.resolvedLanguage?.shouldUpdatePreference)
    ) {
      try {
        await serverSupabase
          .from("profiles")
          .update({ preferred_language: finalResolvedCode })
          .eq("id", userId);
      } catch (prefErr) {
        console.warn("Could not persist preferred_language to profiles:", prefErr);
      }
    }

    // Automatically persist to Supabase ai_history with resolved language
    if (serverSupabase && userId && isUuid(userId)) {
      try {
        await serverSupabase.from("ai_history").insert([
          { user_id: userId, role: "user", message, language: finalResolvedCode },
          { user_id: userId, role: "model", message: agentResult.reply, language: finalResolvedCode },
        ]);
      } catch (dbErr) {
        console.warn("Could not record turn to Supabase ai_history:", dbErr);
      }
    }

    res.json({
      ...agentResult,
      resolvedLanguage: agentResult.resolvedLanguage || resolvedLang,
    });
  } catch (err: any) {
    console.error("AI Assistant Chat Error:", err?.message || err);
    res.status(500).json({
      error: "Unable to complete request at this moment. Please try again shortly.",
    });
  }
});

async function startServer() {
  // Vite dev server integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NeuroSathi Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
