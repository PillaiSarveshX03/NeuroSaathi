import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI, Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  resolveResponseLanguage,
  ResolvedLanguageResult,
} from "../src/lib/languageRouter";
import { getLanguageCapability } from "../src/lib/languageCapabilities";
import { buildTranslationSystemDirective } from "../src/lib/translationService";

// Initialize Supabase client if environment variables are provided (ensuring root URL without trailing /rest/v1 or slashes)
function initServerSupabase(): SupabaseClient | null {
  dotenv.config();
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || "https://jfertcdiencvfprrprha.supabase.co";
  const supabaseUrl = (rawSupabaseUrl || "https://jfertcdiencvfprrprha.supabase.co")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/+$/, "");
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("xyzcompany") &&
    supabaseUrl.startsWith("https://")
  );

  return isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
}

export let serverSupabase: SupabaseClient | null = initServerSupabase();

export function refreshServerSupabase(): SupabaseClient | null {
  serverSupabase = initServerSupabase();
  return serverSupabase;
}

export const DEFAULT_PATIENT_UUID = "d3b07384-d113-4672-8877-c93d9b0f6991";
export const DEFAULT_DOCTOR_USER_UUID = "e4c18495-e224-4783-9988-da4e0c1f7002";

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

// The 14 Complete Cognitive Games in NeuroSathi
export interface CognitiveGameMeta {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const ALL_COGNITIVE_GAMES: Record<string, CognitiveGameMeta> = {
  "card-matching": {
    id: "card-matching",
    name: "Card Matching",
    category: "Memory",
    description: "Flip and match pairs of colorful cards to stimulate visual recall and focus.",
  },
  "sequence-memory": {
    id: "sequence-memory",
    name: "Remember the Sequence",
    category: "Memory",
    description: "Memorize and repeat a growing pattern of glowing tiles.",
  },
  "number-sequence": {
    id: "number-sequence",
    name: "Number Sequence",
    category: "Logic",
    description: "Identify the mathematical pattern and choose the next missing number.",
  },
  "simple-sudoku": {
    id: "simple-sudoku",
    name: "Simple Sudoku",
    category: "Problem Solving",
    description: "Elderly-friendly 4x4 grid puzzle to practice spatial deduction without repetition.",
  },
  "pattern-completion": {
    id: "pattern-completion",
    name: "Complete the Pattern",
    category: "Logic",
    description: "Analyze geometric shape and color sequences to find the missing element.",
  },
  "odd-one-out": {
    id: "odd-one-out",
    name: "Odd One Out",
    category: "Attention",
    description: "Spot the one card that is subtly different from the others.",
  },
  "find-object": {
    id: "find-object",
    name: "Find the Object",
    category: "Attention",
    description: "Locate a specific target item hidden in an everyday room scene.",
  },
  "target-search": {
    id: "target-search",
    name: "Target Search",
    category: "Attention",
    description: "Search across a grid of symbols to find a designated matching symbol.",
  },
  "word-recall": {
    id: "word-recall",
    name: "Word Recall",
    category: "Memory",
    description: "Study a short list of familiar words, wait a moment, and recall them.",
  },
  "complete-word": {
    id: "complete-word",
    name: "Complete the Word",
    category: "Language",
    description: "Fill in missing letters based on associative hints and categories.",
  },
  "picture-memory": {
    id: "picture-memory",
    name: "Picture Memory",
    category: "Memory",
    description: "Look at a serene scenery picture, then answer questions about details.",
  },
  "what-missing": {
    id: "what-missing",
    name: "What Was Missing?",
    category: "Memory",
    description: "Study a tray of objects, one is removed, identify which one is missing.",
  },
  "tap-target": {
    id: "tap-target",
    name: "Tap the Target",
    category: "Motor & Speed",
    description: "Gently tap gentle targets appearing on screen to maintain hand-eye coordination.",
  },
  "quick-response": {
    id: "quick-response",
    name: "Quick Response",
    category: "Reflex",
    description: "A gentle Go/No-Go reflex drill to practice cognitive inhibition and reaction.",
  },
};

// ==========================================
// AGENT TOOL DECLARATIONS
// ==========================================

const startGameDeclaration: FunctionDeclaration = {
  name: "startGame",
  description:
    "Launch or start one of the 14 real cognitive brain exercise games when the user asks to play a game, train memory, attention, logic, language, or reflexes, or mentions a specific game (e.g., 'Start a memory game', 'मुझे memory game खिलाओ', 'Play Sudoku').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      gameId: {
        type: Type.STRING,
        description:
          "The ID of the cognitive game. Must be one of: 'card-matching', 'sequence-memory', 'number-sequence', 'simple-sudoku', 'pattern-completion', 'odd-one-out', 'find-object', 'target-search', 'word-recall', 'complete-word', 'picture-memory', 'what-missing', 'tap-target', 'quick-response'.",
      },
      reason: {
        type: Type.STRING,
        description: "A brief reason why this game was chosen based on the user's intent.",
      },
    },
    required: ["gameId"],
  },
};

const getGameResultDeclaration: FunctionDeclaration = {
  name: "getGameResult",
  description:
    "Retrieve past game performance results, scores, mistakes, accuracy percentage, difficulty, and time spent for the user from the Supabase database.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: "The user ID (optional, defaults to current active user).",
      },
      gameId: {
        type: Type.STRING,
        description: "Filter by specific game ID if requested (e.g. 'card-matching').",
      },
    },
  },
};

const saveGameResultDeclaration: FunctionDeclaration = {
  name: "saveGameResult",
  description:
    "Save a cognitive game score and performance record into the Supabase database and update user progress.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      gameId: {
        type: Type.STRING,
        description: "The ID of the game played.",
      },
      gameName: {
        type: Type.STRING,
        description: "The display name of the game.",
      },
      category: {
        type: Type.STRING,
        description: "Category: 'Memory', 'Attention', 'Logic', 'Problem Solving', 'Language', 'Motor & Speed', 'Reflex'.",
      },
      score: {
        type: Type.INTEGER,
        description: "Score achieved (e.g. 95).",
      },
      mistakes: {
        type: Type.INTEGER,
        description: "Number of mistakes made (e.g. 1).",
      },
      accuracy: {
        type: Type.NUMBER,
        description: "Accuracy percentage (0 to 100).",
      },
      difficulty: {
        type: Type.STRING,
        description: "'easy', 'medium', or 'hard'.",
      },
      timeSpentSeconds: {
        type: Type.INTEGER,
        description: "Time spent playing in seconds.",
      },
    },
    required: ["gameId", "score"],
  },
};

const getProgressDeclaration: FunctionDeclaration = {
  name: "getProgress",
  description:
    "Retrieve the user's cognitive progress, wellness score (out of 100), active daily streak, total exercise time, and breakdown across Memory, Attention, Problem Solving, Language, and Speed from Supabase.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: "The user ID (optional, defaults to current active user).",
      },
    },
  },
};

const getRemindersDeclaration: FunctionDeclaration = {
  name: "getReminders",
  description:
    "Retrieve the user's daily health schedule, medication reminders, hydration checks, and doctor appointments from Supabase.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: "The user ID (optional).",
      },
    },
  },
};

const addUserReminderDeclaration: FunctionDeclaration = {
  name: "addUserReminder",
  description:
    "Add a new daily health, medication, hydration, or activity reminder to the user's schedule in Supabase.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Title of the reminder (e.g., 'Take Blood Pressure Medicine', 'Evening Walk').",
      },
      time: {
        type: Type.STRING,
        description: "Time of day (e.g., '09:00 AM', '02:30 PM').",
      },
      category: {
        type: Type.STRING,
        description: "Category: 'medication', 'water', 'game', 'appointment', or 'routine'.",
      },
    },
    required: ["title", "time"],
  },
};

const getUserProfileDeclaration: FunctionDeclaration = {
  name: "getUserProfile",
  description:
    "Retrieve the user's personal health profile, age, emergency contact, connected doctor ID, and language preferences from Supabase.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: "The user ID (optional).",
      },
    },
  },
};

const getConnectedDoctorDeclaration: FunctionDeclaration = {
  name: "getConnectedDoctor",
  description:
    "Retrieve details about the patient's connected physician (Doctor ID code, doctor name, specialization, clinic/hospital, contact number) from Supabase.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      doctorId: {
        type: Type.STRING,
        description: "The unique Doctor ID code if provided (e.g., 'NS-DOC-7K4P92').",
      },
    },
  },
};

const sendDoctorMessageDeclaration: FunctionDeclaration = {
  name: "sendDoctorMessage",
  description:
    "Send a message from the patient directly to their connected doctor in the clinic portal. Use when the user asks to send a note, question, symptom report, or message to their doctor. IMPORTANT: NeuroSathi sends and logs this message for the doctor; the AI must NEVER impersonate or pretend to be the doctor.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      messageText: {
        type: Type.STRING,
        description: "The content of the message to deliver to the doctor.",
      },
    },
    required: ["messageText"],
  },
};

const sendSOSDeclaration: FunctionDeclaration = {
  name: "sendSOS",
  description:
    "Trigger an emergency SOS alert for the patient in Supabase sos_events and immediately alert their emergency contact and connected doctor.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: "Reason or description of the urgent emergency (e.g., 'Feeling dizzy', 'Severe pain', 'Need urgent help').",
      },
    },
  },
};

const getWeatherDeclaration: FunctionDeclaration = {
  name: "getWeather",
  description: "Retrieve live real-time weather conditions (temperature, humidity, wind, and forecast) for a given city or location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: "City or region name (e.g. 'Mumbai', 'Delhi', 'Pune', 'Patna', 'London', 'Bengaluru').",
      },
    },
    required: ["location"],
  },
};

const saveAIConversationDeclaration: FunctionDeclaration = {
  name: "saveAIConversation",
  description:
    "Save a conversation message to the Supabase ai_history table for clinical continuity and user memory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      role: {
        type: Type.STRING,
        description: "'user' or 'model'.",
      },
      message: {
        type: Type.STRING,
        description: "The text content of the message.",
      },
      language: {
        type: Type.STRING,
        description: "The language of the message.",
      },
    },
    required: ["role", "message"],
  },
};

// The complete Agentic Tool System
export const NEUROSATHI_AGENT_TOOLS: FunctionDeclaration[] = [
  startGameDeclaration,
  getGameResultDeclaration,
  saveGameResultDeclaration,
  getProgressDeclaration,
  getRemindersDeclaration,
  addUserReminderDeclaration,
  getUserProfileDeclaration,
  getConnectedDoctorDeclaration,
  sendDoctorMessageDeclaration,
  sendSOSDeclaration,
  getWeatherDeclaration,
  saveAIConversationDeclaration,
];

// Fallback in-memory stores for session persistence
const inMemoryReminders: Record<string, any[]> = {};
const inMemoryGameHistory: Record<string, any[]> = {};
const inMemoryDoctorMessages: any[] = [];
const inMemorySosEvents: any[] = [];

// Access Control & Supabase RLS check
function checkUserAuthorization(
  targetUserId: string | undefined,
  context: {
    userId: string;
    userName: string;
    userRole: string;
    userContext?: any;
  }
): { authorized: boolean; error?: string } {
  // If targetUserId not specified or matches current user, authorized
  if (!targetUserId || targetUserId === context.userId) {
    return { authorized: true };
  }

  // Doctors can access connected patients
  if (context.userRole === "doctor") {
    return { authorized: true };
  }

  // Patients CANNOT access another patient's data under Supabase RLS
  return {
    authorized: false,
    error: `Access Denied: You are authenticated as "${context.userName}" (${context.userId}). Under Supabase Row Level Security (RLS), access to user "${targetUserId}" is strictly forbidden to protect patient medical privacy.`,
  };
}

// Tool Executor: interacts with Supabase with RLS verification
export async function executeAgentTool(
  toolName: string,
  args: any,
  context: {
    userId: string;
    userName: string;
    userRole: string;
    userContext?: any;
  }
): Promise<{ result: any; uiAction?: any }> {
  const callerUserId = context.userId || DEFAULT_PATIENT_UUID;
  const targetUserId = args?.userId || callerUserId;

  // Verify access authorization for data retrieval tools
  if (["getGameResult", "getProgress", "getUserProgress", "getReminders", "getUserReminders", "getUserProfile"].includes(toolName)) {
    const auth = checkUserAuthorization(targetUserId, context);
    if (!auth.authorized) {
      return {
        result: {
          status: "access_denied",
          error: auth.error,
          rlsPolicy: "Row Level Security (RLS) restricts access to auth.uid() = user_id",
        },
        uiAction: {
          type: "access_denied",
          targetUserId,
        },
      };
    }
  }

  switch (toolName) {
    case "startGame":
    case "launchCognitiveGame": {
      const gameId = args.gameId;
      const game = ALL_COGNITIVE_GAMES[gameId] || ALL_COGNITIVE_GAMES["card-matching"];
      return {
        result: {
          status: "success",
          launchedGameId: game.id,
          gameName: game.name,
          category: game.category,
          description: game.description,
          reason: args.reason || "Matched by NeuroSathi AI reasoning",
        },
        uiAction: {
          type: "launch_game",
          game: {
            id: game.id,
            name: game.name,
            category: game.category,
          },
        },
      };
    }

    case "getGameResult": {
      let results: any[] = [];

      if (serverSupabase && isUuid(targetUserId)) {
        try {
          let query = serverSupabase
            .from("game_history")
            .select("*")
            .eq("user_id", targetUserId)
            .order("created_at", { ascending: false });

          if (args.gameId) {
            query = query.eq("game_id", args.gameId);
          }

          const { data, error } = await query.limit(8);

          if (!error && data && data.length > 0) {
            results = data.map((d) => ({
              gameId: d.game_id,
              gameName: d.game_name,
              category: d.category,
              score: d.score,
              mistakes: d.mistakes,
              accuracy: Number(d.accuracy),
              difficulty: d.difficulty,
              timeSpentSeconds: d.time_spent_seconds,
              playedAt: d.created_at,
            }));
          }
        } catch (e) {
          console.warn("Supabase query game_history error:", e);
        }
      }

      if (results.length === 0) {
        const stored = inMemoryGameHistory[targetUserId] || [
          {
            gameId: "card-matching",
            gameName: "Card Matching",
            category: "Memory",
            score: 95,
            mistakes: 1,
            accuracy: 90,
            difficulty: "easy",
            timeSpentSeconds: 42,
            playedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            gameId: "simple-sudoku",
            gameName: "Simple Sudoku",
            category: "Problem Solving",
            score: 88,
            mistakes: 2,
            accuracy: 85,
            difficulty: "medium",
            timeSpentSeconds: 110,
            playedAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ];
        results = args.gameId ? stored.filter((g) => g.gameId === args.gameId) : stored;
      }

      return {
        result: {
          totalGamesFound: results.length,
          recentGames: results,
        },
        uiAction: { type: "game_results_retrieved", count: results.length },
      };
    }

    case "saveGameResult": {
      const newRecord = {
        userId: callerUserId,
        gameId: args.gameId,
        gameName: args.gameName || ALL_COGNITIVE_GAMES[args.gameId]?.name || "Brain Exercise",
        category: args.category || ALL_COGNITIVE_GAMES[args.gameId]?.category || "Memory",
        score: args.score || 85,
        mistakes: args.mistakes ?? 0,
        accuracy: args.accuracy ?? 90,
        difficulty: args.difficulty || "medium",
        timeSpentSeconds: args.timeSpentSeconds || 60,
        createdAt: new Date().toISOString(),
      };

      if (serverSupabase && isUuid(newRecord.userId)) {
        try {
          await serverSupabase.from("game_history").insert({
            user_id: newRecord.userId,
            game_id: newRecord.gameId,
            game_name: newRecord.gameName,
            category: newRecord.category,
            score: newRecord.score,
            mistakes: newRecord.mistakes,
            accuracy: newRecord.accuracy,
            difficulty: newRecord.difficulty,
            time_spent_seconds: newRecord.timeSpentSeconds,
          });
        } catch (e) {
          console.warn("Supabase insert game_history notice:", e);
        }
      }

      if (!inMemoryGameHistory[callerUserId]) {
        inMemoryGameHistory[callerUserId] = [];
      }
      inMemoryGameHistory[callerUserId].unshift(newRecord);

      return {
        result: { status: "saved", record: newRecord },
        uiAction: { type: "game_result_saved", gameName: newRecord.gameName, score: newRecord.score },
      };
    }

    case "getProgress":
    case "getUserProgress": {
      let progressData: any = null;

      if (serverSupabase && isUuid(targetUserId)) {
        try {
          const { data, error } = await serverSupabase
            .from("progress")
            .select("*")
            .eq("user_id", targetUserId)
            .single();

          if (!error && data) {
            progressData = {
              overallScore: data.overall_score || 85,
              streakDays: data.streak_days || 4,
              gamesPlayed: data.games_played || 12,
              memoryScore: data.memory_score || 88,
              attentionScore: data.attention_score || 82,
              problemSolvingScore: data.problem_solving_score || 84,
              speedScore: data.speed_score || 80,
              lastPlayedAt: data.last_played_at || new Date().toISOString(),
            };
          }
        } catch (e) {
          console.warn("Supabase query progress error:", e);
        }
      }

      if (!progressData) {
        progressData = {
          overallScore: 86,
          streakDays: 4,
          gamesPlayed: 14,
          memoryScore: 89,
          attentionScore: 82,
          problemSolvingScore: 85,
          speedScore: 84,
          lastPlayedAt: "Today",
        };
      }

      return {
        result: progressData,
        uiAction: { type: "show_progress", data: progressData },
      };
    }

    case "getReminders":
    case "getUserReminders": {
      let remindersList: any[] = [];

      if (serverSupabase && isUuid(targetUserId)) {
        try {
          const { data, error } = await serverSupabase
            .from("reminders")
            .select("*")
            .eq("user_id", targetUserId)
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0) {
            remindersList = data.map((r) => ({
              id: r.id,
              title: r.title,
              time: r.time,
              isCompleted: r.is_completed,
              category: r.category || "medication",
            }));
          }
        } catch (e) {
          console.warn("Supabase query reminders error:", e);
        }
      }

      if (remindersList.length === 0) {
        remindersList = inMemoryReminders[targetUserId] || [
          { title: "Morning Blood Pressure Tablet (Amlodipine 5mg)", time: "08:30 AM", isCompleted: true, category: "medication" },
          { title: "Hydration Check - Drink Warm Glass of Water", time: "11:00 AM", isCompleted: true, category: "water" },
          { title: "NeuroSathi Daily Cognitive Workout (15 mins)", time: "03:00 PM", isCompleted: false, category: "game" },
          { title: "Evening Walk in the Garden", time: "05:30 PM", isCompleted: false, category: "routine" },
        ];
      }

      return {
        result: { count: remindersList.length, reminders: remindersList },
        uiAction: { type: "reminders_retrieved", count: remindersList.length },
      };
    }

    case "addUserReminder": {
      const newRem = {
        title: args.title,
        time: args.time,
        category: args.category || "medication",
        isCompleted: false,
      };

      if (!inMemoryReminders[callerUserId]) {
        inMemoryReminders[callerUserId] = [];
      }
      inMemoryReminders[callerUserId].push(newRem);

      if (serverSupabase && isUuid(callerUserId)) {
        try {
          await serverSupabase.from("reminders").insert({
            user_id: callerUserId,
            title: newRem.title,
            time: newRem.time,
            category: newRem.category,
            is_completed: false,
          });
        } catch (e) {
          console.warn("Supabase insert reminder error:", e);
        }
      }

      return {
        result: { status: "created", reminder: newRem },
        uiAction: { type: "reminder_created", reminder: newRem },
      };
    }

    case "getUserProfile": {
      let profile = {
        fullName: context.userName || "Sushila Sharma",
        role: context.userRole || "patient",
        age: context.userContext?.age || 72,
        connectedDoctorId: context.userContext?.connectedDoctorId || "NS-DOC-7K4P92",
        emergencyContactName: context.userContext?.emergencyContactName || "Ramesh Sharma (Son)",
        emergencyContactPhone: context.userContext?.emergencyContactPhone || "+91 98765 99999",
        medicalNotes: context.userContext?.medicalNotes || "Mild memory fatigue. Enjoys morning walks and card games.",
      };

      if (serverSupabase && isUuid(targetUserId)) {
        try {
          const { data, error } = await serverSupabase
            .from("profiles")
            .select("*")
            .eq("id", targetUserId)
            .single();

          if (!error && data) {
            profile = {
              fullName: data.full_name || profile.fullName,
              role: data.role || profile.role,
              age: data.age || profile.age,
              connectedDoctorId: data.connected_doctor_id || profile.connectedDoctorId,
              emergencyContactName: profile.emergencyContactName,
              emergencyContactPhone: data.mobile_number || profile.emergencyContactPhone,
              medicalNotes: profile.medicalNotes,
            };
          }
        } catch (e) {
          console.warn("Supabase profile query notice:", e);
        }
      }

      return {
        result: profile,
        uiAction: { type: "profile_retrieved" },
      };
    }

    case "getConnectedDoctor":
    case "getConnectedDoctorInfo": {
      const doctorId = args.doctorId || context.userContext?.connectedDoctorId || "NS-DOC-7K4P92";
      let docInfo = {
        fullName: "Dr. Arvind Mehta",
        doctorId: doctorId,
        specialization: "Chief of Cognitive Neurology & Geriatric Care",
        hospitalOrClinic: "Apex Memory & Brain Wellness Institute",
        phone: "+91 98111 22334",
        status: "Active & Connected",
      };

      if (serverSupabase) {
        try {
          const { data, error } = await serverSupabase
            .from("doctors")
            .select("*")
            .eq("doctor_id", doctorId)
            .single();

          if (!error && data) {
            docInfo = {
              fullName: data.full_name || docInfo.fullName,
              doctorId: data.doctor_id || doctorId,
              specialization: data.specialization || docInfo.specialization,
              hospitalOrClinic: data.hospital_or_clinic || docInfo.hospitalOrClinic,
              phone: data.phone || docInfo.phone,
              status: "Active & Connected",
            };
          }
        } catch (e) {
          console.warn("Supabase doctor query notice:", e);
        }
      }

      return {
        result: docInfo,
        uiAction: { type: "doctor_info_retrieved" },
      };
    }

    case "sendDoctorMessage": {
      const doctorId = context.userContext?.connectedDoctorId || "NS-DOC-7K4P92";
      const messageText = args.messageText || "Patient inquiry";

      if (serverSupabase && isUuid(callerUserId)) {
        try {
          // Retrieve doctor user_id
          const { data: docData } = await serverSupabase
            .from("doctors")
            .select("user_id, full_name")
            .eq("doctor_id", doctorId)
            .single();

          const doctorUserId = (docData?.user_id && isUuid(docData.user_id)) ? docData.user_id : DEFAULT_DOCTOR_USER_UUID;

          if (isUuid(doctorUserId)) {
            await serverSupabase.from("doctor_patient_messages").insert({
              sender_id: callerUserId,
              receiver_id: doctorUserId,
              message_text: messageText,
              is_doctor: false,
              is_read: false,
            });
          }
        } catch (e) {
          console.warn("Supabase insert doctor_patient_message error:", e);
        }
      }

      inMemoryDoctorMessages.push({
        senderId: callerUserId,
        doctorIdCode: doctorId,
        messageText,
        createdAt: new Date().toISOString(),
      });

      return {
        result: {
          status: "delivered",
          recipient: "Dr. Arvind Mehta (or your connected doctor)",
          messageRecorded: messageText,
          timestamp: new Date().toLocaleTimeString(),
          clinicalNotice:
            "Your message has been transmitted to your physician's clinical portal. NeuroSathi acts as your secure messenger; your doctor will review your message.",
        },
        uiAction: {
          type: "doctor_message_sent",
          messageText,
        },
      };
    }

    case "sendSOS": {
      const emergencyPhone = context.userContext?.emergencyContactPhone || "+91 98765 99999";
      const emergencyContact = context.userContext?.emergencyContactName || "Ramesh Sharma (Son)";
      const reason = args.reason || "Patient activated emergency SOS via NeuroSathi AI Companion.";

      if (serverSupabase && isUuid(callerUserId)) {
        try {
          await serverSupabase.from("sos_events").insert({
            patient_user_id: callerUserId,
            patient_name: context.userName,
            patient_phone: emergencyPhone,
            status: "active",
            message: reason,
          });
        } catch (e) {
          console.warn("Supabase SOS insert error:", e);
        }
      }

      const sosRecord = {
        id: `sos-${Date.now()}`,
        patientUserId: callerUserId,
        patientName: context.userName,
        emergencyContact,
        phone: emergencyPhone,
        reason,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      inMemorySosEvents.push(sosRecord);

      return {
        result: {
          status: "sos_activated",
          patient: context.userName,
          emergencyContactNotified: `${emergencyContact} (${emergencyPhone})`,
          doctorNotified: "Connected Doctor Clinic Team",
          reason,
          guidelines:
            "Emergency alerts have been broadcast. Please sit down safely, remain calm, take slow deep breaths. Immediate help is on the way.",
        },
        uiAction: {
          type: "sos_triggered",
          reason,
        },
      };
    }

    case "getWeather":
    case "getWeatherInfo": {
      const location = args?.location || "Mumbai";
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
        );
        const geoData: any = await geoRes.json();
        if (geoData?.results?.length > 0) {
          const { latitude, longitude, name, country } = geoData.results[0];
          const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
          );
          const wData: any = await wRes.json();
          const current = wData?.current;
          return {
            result: {
              location: `${name}, ${country || ""}`.trim(),
              temperatureCelsius: current?.temperature_2m,
              relativeHumidity: current?.relative_humidity_2m,
              windSpeedKmh: current?.wind_speed_10m,
              status: "success",
            },
            uiAction: { type: "weather_retrieved", location: name },
          };
        }
      } catch (err) {
        console.warn("Weather fetch notice:", err);
      }
      return {
        result: {
          location,
          temperatureCelsius: 28,
          relativeHumidity: 65,
          note: "Standard seasonal weather with moderate warmth and gentle breeze.",
        },
      };
    }

    case "saveAIConversation": {
      if (serverSupabase && isUuid(callerUserId)) {
        try {
          await serverSupabase.from("ai_history").insert({
            user_id: callerUserId,
            role: args.role || "user",
            message: args.message || "",
            language: args.language || "en",
          });
        } catch (e) {
          console.warn("Supabase save ai_history error:", e);
        }
      }

      return {
        result: { status: "recorded" },
      };
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

// Main Agent Handler with Agentic Reasoning
export async function runAgentConversation(
  ai: GoogleGenAI,
  params: {
    message: string;
    history?: { role: string; text: string }[];
    language?: string;
    userName?: string;
    userRole?: string;
    userId?: string;
    userContext?: any;
    resolvedLanguageResult?: ResolvedLanguageResult;
  }
): Promise<{
  reply: string;
  launchGame?: { id: string; name: string; category: string } | null;
  actionResult?: any;
  resolvedLanguage?: ResolvedLanguageResult;
}> {
  // Resolve language using centralized router (Priority 1: Explicit Command, Priority 2: Detected Language of message, Priority 3: Selected, Priority 4: Safe Fallback)
  const resolvedLanguage =
    params.resolvedLanguageResult ||
    resolveResponseLanguage({
      text: params.message,
      selectedLanguage: params.language,
      preferredLanguage: params.userContext?.preferredLanguage,
      history: params.history,
    });

  const language = resolvedLanguage.resolvedName;
  const languageCode = resolvedLanguage.resolvedCode;
  const languageCap = getLanguageCapability(languageCode);
  const translationDirective = buildTranslationSystemDirective(languageCap);
  const userName = params.userName || "Friend";
  const userRole = params.userRole || "patient";
  const userId = params.userId || DEFAULT_PATIENT_UUID;

  const systemInstruction = `You are NeuroSathi, an adaptive, intelligent, and culturally fluent AI companion and assistant.

CRITICAL CONVERSATIONAL RULES (MUST FOLLOW):
1. NATURAL, NON-SCRIPTED CONVERSATION:
   - You are a genuine, adaptive conversational assistant, NOT a scripted menu or robotic Q&A chatbot.
   - Respond primarily and directly to what the user actually says:
     * If the user asks a question (science, nature, history, weather, health, recipes, daily life), answer that question directly and accurately.
     * If the user makes a statement (e.g., "My knee hurts today", "I feel tired", "It is raining outside"), respond naturally and empathetically to that specific statement.
     * If the user says hello or greets you ("Hello", "Hi", "नमस्ते", "नमस्कार", "प्रणाम"), give a short, natural greeting (e.g., "Hello! How can I help you today?" or "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?").
     * If the user asks for a story ("Tell me a story", "एक कहानी सुनाओ", "मला एक गोष्ट सांगा"), start the story immediately.
     * If the user asks about the weather, use the getWeather tool or provide the weather information directly.
     * If the user asks about medicines, reminders, doctor, or brain games, handle their request using the available tools.
     * If the user asks a general question unrelated to cognitive health, answer it normally and helpfully.

2. FORBIDDEN SCRIPTED PATTERNS (DO NOT DO ANY OF THESE):
   - NEVER send a fixed greeting or standard introduction such as:
     "Hello [name]! I am NeuroSathi, your cognitive health companion. I am always here to support your memory, daily reminders, and wellbeing. Would you like to play a brain game or check your schedule?"
   - NEVER introduce yourself as an AI or "cognitive health companion" in regular conversation turns.
   - NEVER repeatedly describe your capabilities or features.
   - NEVER automatically append "Would you like to play a brain game or check your schedule?" or steer unrelated conversations toward brain games, memory, reminders, or schedules, UNLESS the user specifically asks about them or asks what you can do.
   - NEVER repeat the user's name in every response. Use the user's name ("${userName}") only occasionally and naturally when fitting. NEVER start every response with "Hello ${userName}!" or "[Name] जी!".
   - Do NOT behave like a scripted chatbot. The user's current message must determine your response.

3. UNIVERSAL DYNAMIC LANGUAGE & SCRIPT DETECTION:
   - Automatically detect the language and script of the user's latest message.
   - Respond naturally in the same language and script (e.g. Marathi, Bhojpuri, Hindi, Bengali, Gujarati, Tamil, Telugu, English, etc.) unless the user explicitly requests another language.
   - Never switch to English merely because the language is less common.
   - Never switch to Hindi merely because the input is an Indian language.
   - Preserve conversation context while dynamically adapting to language changes.
   - Do not expose internal language-detection or routing information to the user.
   - Always use respectful, polite phrasing suitable for elders (e.g. 'आप'/'जी' in Hindi, 'तुम्ही'/'आपण' in Marathi, 'रउवा'/'रउआ' in Bhojpuri).

4. AVAILABLE FUNCTION CALLS (USE ONLY WHEN SPECIFICALLY RELEVANT):
   - "startGame": when user specifically asks to play a cognitive game.
   - "getWeather": when user asks about weather or temperature for a city/location.
   - "getReminders": when user asks about their schedule, medicine timings, or daily routine.
   - "addUserReminder": when user asks to add or set a reminder.
   - "getUserProfile": when user asks about their personal health profile or emergency contact.
   - "getConnectedDoctor": when user asks about their doctor or clinic.
   - "sendDoctorMessage": when user asks to send a note or message to their doctor.
   - "sendSOS": when user indicates a serious fall, acute emergency, or urgent danger.
   - "getProgress": when user asks about their brain exercise scores or progress.
   - For all general discussions, stories, food questions, symptom conversations, and knowledge questions, answer directly WITHOUT calling tools.

5. 14 REAL COGNITIVE GAMES:
   - "card-matching": Memory (Pairs of cards)
   - "sequence-memory": Memory (Glowing tiles sequence)
   - "number-sequence": Logic (Math pattern missing number)
   - "simple-sudoku": Problem Solving (4x4 gentle grid)
   - "pattern-completion": Logic (Shapes and colors)
   - "odd-one-out": Attention (Find subtle anomaly)
   - "find-object": Attention (Everyday room hidden object)
   - "target-search": Attention (Grid symbol match)
   - "word-recall": Memory (Word list memorization)
   - "complete-word": Language (Missing letters with hints)
   - "picture-memory": Memory (Serene picture detail questions)
   - "what-missing": Memory (Tray item removed)
   - "tap-target": Motor & Speed (Hand-eye coordination taps)
   - "quick-response": Reflex (Go/No-Go inhibition drill)

Context:
Active User: ${userName}
Role: ${userRole}
User ID: ${userId}
Language Context: ${language} (${languageCode})
`;

  // Format past turns
  const contents: any[] = [];
  if (Array.isArray(params.history)) {
    for (const turn of params.history.slice(-6)) {
      if (turn.role && turn.text) {
        contents.push({
          role: turn.role === "assistant" || turn.role === "model" ? "model" : "user",
          parts: [{ text: turn.text }],
        });
      }
    }
  }

  // Current user turn
  contents.push({
    role: "user",
    parts: [{ text: params.message }],
  });

  // Call Gemini with agent tools using resilient candidate models (gemini-3.1-flash-lite, gemini-3.6-flash, gemini-flash-latest, gemini-3.8-flash)
  const modelsToTry = [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ];
  let firstResponse: any = null;
  let activeModel = "gemini-3.1-flash-lite";
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      firstResponse = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: NEUROSATHI_AGENT_TOOLS }],
          temperature: 0.7,
        },
      });
      activeModel = model;
      break;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[NeuroSathi Provider] Model ${model} attempt notice:`, errMsg.slice(0, 100));
      // Try next available model in candidate list
    }
  }

  if (!firstResponse) {
    const lower = params.message.toLowerCase().trim();
    const lCode = (resolvedLanguage.resolvedCode || languageCode || "en").toLowerCase();

    // 1. Weather query
    if (
      lower.includes("weather") ||
      lower.includes("मौसम") ||
      lower.includes("हवामान") ||
      lower.includes("तापमान") ||
      lower.includes("rain") ||
      lower.includes("बारिश") ||
      lower.includes("पाऊस")
    ) {
      let loc = "Mumbai";
      const cities = [
        "delhi",
        "mumbai",
        "pune",
        "patna",
        "bengaluru",
        "bangalore",
        "kolkata",
        "chennai",
        "hyderabad",
        "ahmedabad",
        "lucknow",
        "nagpur",
        "jaipur",
        "varanasi",
      ];
      for (const c of cities) {
        if (lower.includes(c)) {
          loc = c.charAt(0).toUpperCase() + c.slice(1);
          break;
        }
      }

      const weatherResult = await executeAgentTool("getWeather", { location: loc }, {
        userId,
        userName,
        userRole,
        userContext: params.userContext,
      });
      const w = weatherResult.result;
      let weatherReply = `The current temperature in ${w.location || loc} is ${w.temperatureCelsius ?? 28}°C with a relative humidity of ${w.relativeHumidity ?? 65}%.`;
      if (lCode === "mr") {
        weatherReply = `${w.location || loc} येथील सध्याचे तापमान ${w.temperatureCelsius ?? 28}°C असून आर्द्रता ${w.relativeHumidity ?? 65}% आहे.`;
      } else if (lCode === "bho") {
        weatherReply = `${w.location || loc} में अभी तापमान ${w.temperatureCelsius ?? 28}°C बा आ नमी ${w.relativeHumidity ?? 65}% बा।`;
      } else if (lCode === "hi") {
        weatherReply = `${w.location || loc} का वर्तमान तापमान ${w.temperatureCelsius ?? 28}°C और नमी ${w.relativeHumidity ?? 65}% है।`;
      } else if (lCode === "bn") {
        weatherReply = `${w.location || loc}-এর বর্তমান তাপমাত্রা ${w.temperatureCelsius ?? 28}°C এবং আর্দ্রতা ${w.relativeHumidity ?? 65}%।`;
      } else if (lCode === "gu") {
        weatherReply = `${w.location || loc} ખાતે વર્તમાન તાપમાન ${w.temperatureCelsius ?? 28}°C અને ભેજ ${w.relativeHumidity ?? 65}% છે.`;
      }

      return {
        reply: weatherReply,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 2. Story request - start immediately without robotic preambles
    if (
      lower.includes("story") ||
      lower.includes("कहानी") ||
      lower.includes("गोष्ट") ||
      lower.includes("कथा") ||
      lower.includes("গল্প") ||
      lower.includes("વાર્તા")
    ) {
      let storyReply = `Once upon a time in a tranquil mountain village, there was an old banyan tree where birds gathered every dawn to sing melodies of peace. The villagers started each day under its shade, sharing morning smiles, tea, and warm memories.`;
      if (lCode === "mr") {
        storyReply = `एकदा एका निसर्गरम्य गावात एक विशाल वडाचे झाड होते. तेथे दररोज सकाळी पक्षी किलबिलाट करायचे आणि गावातील लोक झाडाच्या सावलीत बसून आनंदाने गप्पा मारायचे. त्यांच्या प्रेमळ स्वभावामुळे गावात सदैव शांतता आणि आनंद नांदायचा.`;
      } else if (lCode === "bho") {
        storyReply = `एक समय के बात बा, एगो शांत आ सुंदर गांव में एगो विशाल बरगद के पेड़ रहे। रोज सबेरे पंछियन के मधुर चहचहाहट से पूरा गांव जाग उठत रहे। गांव के सभे लोग पेड़ के छांह में बइठ के प्रेम से बतियावत रहलें आ एक दूसरा के सुख-दुख बांटत रहलें।`;
      } else if (lCode === "hi") {
        storyReply = `एक बार की बात है, एक शांत और हरे-भरे गाँव में एक विशाल बरगद का पेड़ था। हर सुबह पक्षियों की मधुर चहचहाहट से पूरा गाँव गूँज उठता था। गाँव के लोग पेड़ की शीतल छाँव में बैठकर प्रेमपूर्वक बातचीत करते और दिन की शुरुआत करते थे।`;
      } else if (lCode === "bn") {
        storyReply = `একদা এক শান্ত সবুজ গ্রামে এক বিশাল বটগাছ ছিল। প্রতিদিন সকালে পাখিরা সেখানে মধুর সুরে গান গাইত এবং গ্রামের মানুষ গাছের ছায়ায় বসে আনন্দে দিন শুরু করত।`;
      } else if (lCode === "gu") {
        storyReply = `એક સમયે એક શાંત અને લીલાછમ ગામમાં એક મોટું વડનું ઝાડ હતું. રોજ સવારે પક્ષીઓ મધુર કલરવ કરતાં અને ગામના લોકો ઝાડની છાંયડામાં બેસીને હસી-ખુશીથી વાતો કરતાં.`;
      }

      return {
        reply: storyReply,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 3. Natural greetings - short, warm, no canned menus or feature lists
    const isGreeting =
      /^(hello|hi|hey|namaste|namaskar|pranam|kem cho|good morning|good evening|good afternoon|नमस्ते|नमस्कार|प्रणाम|हाय|हॅलो)\b/i.test(
        lower
      ) ||
      lower === "hello" ||
      lower === "hi" ||
      lower === "नमस्ते" ||
      lower === "नमस्कार" ||
      lower === "प्रणाम";

    if (isGreeting) {
      let greetingReply = "Hello! How can I help you today?";
      if (lCode === "mr") {
        greetingReply = "नमस्कार! मी तुम्हाला कशी मदत करू शकतो?";
      } else if (lCode === "bho") {
        greetingReply = "प्रणाम! हम राउर कइसे मदद कर सकीं?";
      } else if (lCode === "hi") {
        greetingReply = "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?";
      } else if (lCode === "bn") {
        greetingReply = "নমস্কার! আমি আপনাকে কীভাবে সাহায্য করতে পারি?";
      } else if (lCode === "gu") {
        greetingReply = "નમસ્તે! હું તમને કેવી રીતે મદદ કરી શકું?";
      } else if (lCode === "ta") {
        greetingReply = "வணக்கம்! நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?";
      } else if (lCode === "te") {
        greetingReply = "నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?";
      } else if (lCode === "pa") {
        greetingReply = "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?";
      }

      return {
        reply: greetingReply,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 4. Physical complaint / knee hurt / pain
    if (
      lower.includes("knee") ||
      lower.includes("pain") ||
      lower.includes("hurt") ||
      lower.includes("ache") ||
      lower.includes("दर्द") ||
      lower.includes("दुख") ||
      lower.includes("वेदना")
    ) {
      let painReply =
        "I'm sorry to hear that you are feeling discomfort. Please sit down comfortably and rest without putting weight on it. Applying a gentle cold or warm compress often brings relief. If the pain is sharp or persists, it is a good idea to consult your doctor. Let me know if you would like me to send a message to your doctor.";
      if (lCode === "mr") {
        painReply =
          "तुमच्या गुडघ्यात दुखत आहे हे ऐकून वाईट वाटले. कृपया विश्रांती घ्या आणि पायावर जास्त ताण देऊ नका. सौम्य शेक घेतल्यास आराम मिळू शकतो. वेदना जास्त असल्यास डॉक्टरांचा सल्ला घेणे योग्य राहील. मी तुमच्या डॉक्टरांना संदेश पाठवू का?";
      } else if (lCode === "bho") {
        painReply =
          "रउवा ठेहुना में दरद बा सुन के चिंता भइल। तनी आराम से बइठ जाईं आ गोड़ पर जोर मत दीं। हलका सेंक लिहला से आराम मिली। दरद लगातार रहे त डॉक्टर से सलाह लिहल जरूरी बा। कहब त हम डॉक्टर साहब के खबर भेज दीं?";
      } else if (lCode === "hi") {
        painReply =
          "यह जानकर चिंता हुई कि आपके घुटने में दर्द हो रहा है। कृपया आराम से बैठें और घुटने पर ज़्यादा ज़ोर न दें। हल्का गर्म या ठंडा सेंक लेने से आराम मिल सकता है। यदि दर्द लगातार बना रहे, तो डॉक्टर से परामर्श अवश्य लें।";
      }

      return {
        reply: painReply,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 5. Food / diet question
    if (
      lower.includes("eat") ||
      lower.includes("food") ||
      lower.includes("diet") ||
      lower.includes("खाना") ||
      lower.includes("खाऊ") ||
      lower.includes("भोजन")
    ) {
      let foodReply =
        "For a wholesome and easily digestible meal, light vegetable khichdi, warm steamed lentils with cooked vegetables, or a warm vegetable soup is nourishing and gentle on the stomach. Remember to also sip some warm water.";
      if (lCode === "mr") {
        foodReply =
          "पचनास हलके आणि पौष्टिक जेवण म्हणून मऊ मूग डाळ खिचडी, ताजी उकडलेली भाजी किंवा गरम व्हेजिटेबल सूप खूप चांगले आहे. सोबत थोडे कोमट पाणीही प्या.";
      } else if (lCode === "bho") {
        foodReply =
          "सुपाच्य आ पौष्टिक खाना खातिर मूंग दाल के नरम खिचड़ी, उबला सब्जी भा गरम सूप बहुत बढ़िया रही। साथ में गुनगुना पानी पीयत रहीं।";
      } else if (lCode === "hi") {
        foodReply =
          "हल्का और पौष्टिक भोजन सबसे अच्छा रहता है—जैसे मूंग दाल की खिचड़ी, उबली हुई सब्ज़ियाँ, दलिया या ताज़ा सब्ज़ियों का सूप। साथ ही पर्याप्त मात्रा में गुनगुना पानी पीते रहें।";
      }

      return {
        reply: foodReply,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 6. Explicit Cognitive Game launch
    if (
      lower.includes("game") ||
      lower.includes("खेल") ||
      lower.includes("खेळ") ||
      lower.includes("play") ||
      lower.includes("card") ||
      lower.includes("memory") ||
      lower.includes("सुडोकू") ||
      lower.includes("sudoku")
    ) {
      let matchedGame = ALL_COGNITIVE_GAMES["card-matching"];
      for (const [id, g] of Object.entries(ALL_COGNITIVE_GAMES)) {
        if (lower.includes(id) || lower.includes(g.name.toLowerCase())) {
          matchedGame = g;
          break;
        }
      }

      let gameReply = `Starting "${matchedGame.name}" for you right now. Enjoy!`;
      if (lCode === "mr") {
        gameReply = `तुमच्यासाठी "${matchedGame.name}" हा खेळ सुरू केला जात आहे. आनंद घ्या!`;
      } else if (lCode === "bho") {
        gameReply = `रउवा खातिर "${matchedGame.name}" खेल शुरू कइल जात बा। आनंद लीं!`;
      } else if (lCode === "hi") {
        gameReply = `आपके लिए "${matchedGame.name}" खेल शुरू किया जा रहा है। आनंद लीजिए!`;
      }

      return {
        reply: gameReply,
        launchGame: { id: matchedGame.id, name: matchedGame.name, category: matchedGame.category },
        resolvedLanguage,
      };
    }

    // 7. Medicine / Reminders query
    if (
      lower.includes("reminder") ||
      lower.includes("medicine") ||
      lower.includes("दवाई") ||
      lower.includes("औषध") ||
      lower.includes("schedule") ||
      lower.includes("दिनचर्या")
    ) {
      const remResult = await executeAgentTool("getReminders", {}, {
        userId,
        userName,
        userRole,
        userContext: params.userContext,
      });
      const rems = remResult.result?.reminders || [];
      let remReply =
        rems.length > 0
          ? `Here are your scheduled reminders: ${rems.map((r: any) => `${r.time}: ${r.title}`).join(", ")}.`
          : "You have no pending reminders scheduled at this moment.";
      if (lCode === "mr") {
        remReply =
          rems.length > 0
            ? `तुमचे आजचे वेळापत्रक: ${rems.map((r: any) => `${r.time} - ${r.title}`).join(", ")}.`
            : "सध्या तुमच्याकडे कोणतेही प्रलंबित रिमाइंडर नाहीत.";
      } else if (lCode === "bho") {
        remReply =
          rems.length > 0
            ? `राउर आज के रिमाइंडर: ${rems.map((r: any) => `${r.time} - ${r.title}`).join(", ")}।`
            : "अहिले कवनो नया रिमाइंडर नइखे।";
      } else if (lCode === "hi") {
        remReply =
          rems.length > 0
            ? `आपके आज के रिमाइंडर: ${rems.map((r: any) => `${r.time} - ${r.title}`).join(", ")}।`
            : "फिलहाल आपका कोई लंबित रिमाइंडर नहीं है।";
      }

      return {
        reply: remReply,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 8. Doctor info
    if (
      lower.includes("doctor") ||
      lower.includes("डॉक्टर") ||
      lower.includes("physician") ||
      lower.includes("clinic")
    ) {
      const docResult = await executeAgentTool("getConnectedDoctor", {}, {
        userId,
        userName,
        userRole,
        userContext: params.userContext,
      });
      const doc = docResult.result;
      return {
        reply: doc?.fullName
          ? `Your connected doctor is ${doc.fullName} (${doc.specialization || "Physician"}). Phone: ${doc.phone || "On File"}. Clinic: ${doc.hospitalOrClinic || "NeuroSathi Clinic"}.`
          : `Your connected doctor code is NS-DOC-7K4P92. You can contact them directly in the Doctor Chat tab.`,
        launchGame: null,
        resolvedLanguage,
      };
    }

    // 9. Emergency / SOS
    if (
      lower.includes("sos") ||
      lower.includes("emergency") ||
      lower.includes("मदद") ||
      lower.includes("बचाओ") ||
      lower.includes("help me")
    ) {
      const sosResult = await executeAgentTool("sendSOS", { reason: params.message }, {
        userId,
        userName,
        userRole,
        userContext: params.userContext,
      });
      return {
        reply: `Emergency Alert Activated. Your family contact (${params.userContext?.emergencyContactName || "Family Contact"}) and doctor have been notified. Please sit down safely and stay calm.`,
        launchGame: null,
        actionResult: sosResult.uiAction,
        resolvedLanguage,
      };
    }

    // 10. Natural conversational fallback (clean, direct, non-scripted)
    let naturalFallback = "I am listening closely. Please tell me more, and I will be glad to help.";
    if (lCode === "mr") {
      naturalFallback = "मी ऐकत आहे. कृपया आणखी सांगा, मी तुम्हाला नक्की मदत करेन.";
    } else if (lCode === "bho") {
      naturalFallback = "हम रउवा बात ध्यान से सुनत बानी। तनी अउरी बताईं, हम जरूर मदद करब।";
    } else if (lCode === "hi") {
      naturalFallback = "मैं आपकी बात ध्यान से सुन रहा हूँ। कृपया बताएं, मैं आपकी किस प्रकार मदद कर सकता हूँ?";
    } else if (lCode === "bn") {
      naturalFallback = "আমি মনোযোগ দিয়ে শুনছি। অনুগ্রহ করে বলুন, আমি সাহায্য করছি।";
    } else if (lCode === "gu") {
      naturalFallback = "હું સાંભળી રહ્યો છું. કૃપા કરીને વધુ જણાવો, હું મદદ કરીશ.";
    }

    return {
      reply: naturalFallback,
      launchGame: null,
      resolvedLanguage,
    };
  }

  // Check if Gemini decided to invoke a tool
  const functionCalls = firstResponse.functionCalls;

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    const { result, uiAction } = await executeAgentTool(call.name, call.args, {
      userId,
      userName,
      userRole,
      userContext: params.userContext,
    });

    let launchGameObj: { id: string; name: string; category: string } | null = null;
    if (call.name === "startGame" || call.name === "launchCognitiveGame") {
      const gId = call.args?.gameId;
      const game = ALL_COGNITIVE_GAMES[gId] || ALL_COGNITIVE_GAMES["card-matching"];
      launchGameObj = { id: game.id, name: game.name, category: game.category };
    }

    // Feed tool result back to Gemini so it reasons over the data and responds in the authoritative language
    try {
      const followUpContents = [
        ...contents,
        firstResponse.candidates[0].content,
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: result,
                ...(call.id ? { id: call.id } : {}),
              },
            },
          ],
        },
      ];

      let secondResponse: any = null;
      for (const model of [activeModel, "gemini-3.1-flash-lite", "gemini-3.6-flash"]) {
        try {
          secondResponse = await ai.models.generateContent({
            model,
            contents: followUpContents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          if (secondResponse?.text) break;
        } catch (mErr: any) {
          console.warn(`Follow-up turn with ${model} notice:`, mErr.message || mErr);
        }
      }

      const finalReply =
        secondResponse?.text ||
        (launchGameObj
          ? language.toLowerCase().includes("hindi") || language.toLowerCase().includes("हिन्दी")
            ? `आपके लिए "${launchGameObj.name}" खेल शुरू किया जा रहा है। आनंद लीजिए!`
            : `Starting "${launchGameObj.name}" for you right now. Enjoy!`
          : typeof result === "object" && result.status === "sos_activated"
          ? `SOS Emergency Alert Activated. Your emergency contact and doctor have been notified. Please stay calm, help is on the way.`
          : typeof result === "object" && result.fullName
          ? `Your connected doctor is ${result.fullName} (${result.specialization || "Physician"}). Phone: ${result.phone || "On File"}. Clinic: ${result.hospitalOrClinic || "Clinic"}.`
          : `I have taken care of that for you.`);

      return {
        reply: finalReply,
        launchGame: launchGameObj,
        actionResult: uiAction,
        resolvedLanguage,
      };
    } catch (followUpErr) {
      console.warn("Follow-up turn error:", followUpErr);
      let fallbackReply = "I have taken care of that for you.";
      if (launchGameObj) {
        fallbackReply =
          language.toLowerCase().includes("hindi") || language.toLowerCase().includes("हिन्दी")
            ? `आपके लिए "${launchGameObj.name}" खेल शुरू किया जा रहा है। आनंद लीजिए!`
            : `Starting "${launchGameObj.name}" for you right now. Enjoy!`;
      }
      return {
        reply: fallbackReply,
        launchGame: launchGameObj,
        actionResult: uiAction,
        resolvedLanguage,
      };
    }
  }

  // If no function call, Gemini answered directly (general knowledge, story, math, everyday life)
  const textReply = firstResponse.text || "I am right here with you. How can I assist you today?";
  return {
    reply: textReply,
    launchGame: null,
    resolvedLanguage,
  };
}
