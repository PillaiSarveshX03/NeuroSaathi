/**
 * NeuroSathi Shared TypeScript Types & Interfaces
 */

export type UserRole = "patient" | "doctor";

export type GameDifficulty = "easy" | "medium" | "hard";

export interface UserProfile {
  id: string; // Supabase auth.users uid
  role: UserRole;
  fullName: string;
  age?: number;
  mobileNumber?: string;
  email?: string;
  doctorId?: string; // e.g. "NS-DOC-7K4P92" for doctors
  connectedDoctorId?: string; // Doctor ID for patients
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  specialization?: string;
  hospital?: string;
  preferredLanguage: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  doctorId: string; // NS-DOC-XXXXXX
  fullName: string;
  specialization: string;
  phone?: string;
  hospitalOrClinic?: string;
  createdAt: string;
}

export interface DoctorPatientConnection {
  id: string;
  doctorUserId: string;
  patientUserId: string;
  doctorIdCode: string;
  status: "active" | "pending";
  patientName?: string;
  patientAge?: number;
  patientPhone?: string;
  connectedAt: string;
}

export interface DoctorPatientMessage {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isDoctor: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface GameResult {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  category: "Memory" | "Attention" | "Problem Solving" | "Language" | "Motor & Speed" | "Reflex";
  score: number;
  mistakes: number;
  accuracy: number; // 0 - 100
  difficulty: GameDifficulty;
  timeSpentSeconds: number;
  createdAt: string;
}

export interface UserProgress {
  userId: string;
  overallScore: number;
  gamesPlayed: number;
  memoryScore: number;
  attentionScore: number;
  problemSolvingScore: number;
  speedScore: number;
  streakDays: number;
  lastPlayedAt: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  userId: string;
  title: string;
  time: string; // e.g. "08:00 AM"
  timeOfDay?: string;
  category?: "medication" | "water" | "game" | "appointment" | string;
  isCompleted: boolean;
  frequency?: "daily" | "weekly" | "once";
  createdAt: string;
}

export type DailyReminder = ReminderItem;

export interface AiChatMessage {
  id: string;
  userId: string;
  role: "user" | "model" | "assistant";
  message: string;
  language: string;
  launchGame?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface SosEvent {
  id: string;
  patientUserId: string;
  patientName: string;
  patientPhone?: string;
  doctorUserId?: string;
  status: "active" | "acknowledged" | "resolved";
  message?: string;
  createdAt: string;
}

export interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  speechCode?: string; // BCP 47 tag for speech synthesis & recognition
}

export type ActiveView = 
  | "home"
  | "voice"
  | "chat"
  | "games"
  | "reminders"
  | "progress"
  | "doctor"
  | "profile"
  | "sos";
