import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  UserRole,
  UserProfile,
  DoctorProfile,
  DoctorPatientConnection,
  DoctorPatientMessage,
  GameResult,
  UserProgress,
  ReminderItem,
  AiChatMessage,
  SosEvent,
} from "../types";

// Root Supabase URL configuration (ensures clean root origin without trailing /rest/v1 or trailing slashes)
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== "undefined" && (import.meta as any)?.env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== "undefined" && process?.env?.[key]) {
    return process.env[key] || "";
  }
  return "";
};

const rawSupabaseUrl = getEnvVar("VITE_SUPABASE_URL") || "https://jfertcdiencvfprrprha.supabase.co";
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY");

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes("xyzcompany") && 
  supabaseUrl.startsWith("https://")
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * PostgreSQL Schema & RLS Policies for Supabase Dashboard
 */
export const SUPABASE_SCHEMA_SQL = `-- NeuroSathi Complete PostgreSQL Database Schema with RLS
-- Run this in your Supabase SQL Editor:

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
  full_name TEXT NOT NULL,
  age INTEGER,
  mobile_number TEXT,
  email TEXT NOT NULL,
  doctor_id TEXT, -- Unique Doctor ID (e.g. NS-DOC-7K4P92) for doctors
  connected_doctor_id TEXT, -- Connected doctor code for patients
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  phone TEXT,
  hospital_or_clinic TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Doctor-Patient Connections Table
CREATE TABLE IF NOT EXISTS public.doctor_patient_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id_code TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  patient_name TEXT,
  patient_age INTEGER,
  patient_phone TEXT,
  connected_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(doctor_user_id, patient_user_id)
);

-- 4. Doctor-Patient Messages Table (Realtime)
CREATE TABLE IF NOT EXISTS public.doctor_patient_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_doctor BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Game History Table
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  mistakes INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_spent_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Progress Table
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 80,
  games_played INTEGER DEFAULT 0,
  memory_score INTEGER DEFAULT 80,
  attention_score INTEGER DEFAULT 80,
  problem_solving_score INTEGER DEFAULT 80,
  speed_score INTEGER DEFAULT 80,
  streak_days INTEGER DEFAULT 1,
  last_played_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Reminders Table
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'medication' CHECK (category IN ('medication', 'water', 'hydration', 'activity', 'game', 'appointment', 'exercise', 'routine', 'other')),
  is_completed BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. AI History Table
CREATE TABLE IF NOT EXISTS public.ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model', 'assistant')),
  message TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. SOS Events Table
CREATE TABLE IF NOT EXISTS public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  doctor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies using auth.uid()
-- Profiles: Users can view and update their own profile; doctors can view connected patients
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Doctors can view connected patient profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.doctor_patient_connections
      WHERE doctor_user_id = auth.uid() AND patient_user_id = public.profiles.id
    )
  );

-- Doctors table: viewable by all (for code verification), manageable strictly by the doctor owner
CREATE POLICY "Doctors viewable by all users" ON public.doctors
  FOR SELECT USING (true);
CREATE POLICY "Doctors manage their own row" ON public.doctors
  FOR ALL USING (auth.uid() = user_id);

-- Connections: Doctor and patient can view and manage their connection
CREATE POLICY "Connection visible to doctor or patient" ON public.doctor_patient_connections
  FOR SELECT USING (auth.uid() = doctor_user_id OR auth.uid() = patient_user_id);
CREATE POLICY "Connection insertable by patient" ON public.doctor_patient_connections
  FOR INSERT WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY "Connection updatable by participants" ON public.doctor_patient_connections
  FOR UPDATE USING (auth.uid() = doctor_user_id OR auth.uid() = patient_user_id);

-- Messages: Sender and receiver can view, sender can insert, receiver can update
CREATE POLICY "Messages visible to participants" ON public.doctor_patient_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Messages insertable by sender" ON public.doctor_patient_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.doctor_patient_connections
        WHERE (doctor_user_id = auth.uid() AND patient_user_id = receiver_id)
           OR (patient_user_id = auth.uid() AND doctor_user_id = receiver_id)
      )
    )
  );
CREATE POLICY "Messages updatable by participants" ON public.doctor_patient_messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Game History: Patient can manage; connected doctor can view
CREATE POLICY "Game history viewable by owner and doctor" ON public.game_history
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.doctor_patient_connections
      WHERE doctor_user_id = auth.uid() AND patient_user_id = public.game_history.user_id
    )
  );
CREATE POLICY "Game history insertable by owner" ON public.game_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Progress: Patient can manage; connected doctor can view
CREATE POLICY "Progress viewable by owner and doctor" ON public.progress
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.doctor_patient_connections
      WHERE doctor_user_id = auth.uid() AND patient_user_id = public.progress.user_id
    )
  );
CREATE POLICY "Progress modifiable by owner" ON public.progress
  FOR ALL USING (auth.uid() = user_id);

-- Reminders: Patient can manage; connected doctor can view
CREATE POLICY "Reminders visible to owner and doctor" ON public.reminders
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.doctor_patient_connections
      WHERE doctor_user_id = auth.uid() AND patient_user_id = public.reminders.user_id
    )
  );
CREATE POLICY "Reminders insertable by owner" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reminders updatable by owner" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Reminders deletable by owner" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

-- AI History: Owner can manage
CREATE POLICY "AI History visible to owner" ON public.ai_history
  FOR ALL USING (auth.uid() = user_id);

-- SOS Events: Visible to patient and their connected doctor
CREATE POLICY "SOS visible to patient and doctor" ON public.sos_events
  FOR SELECT USING (
    auth.uid() = patient_user_id OR
    auth.uid() = doctor_user_id OR
    EXISTS (
      SELECT 1 FROM public.doctor_patient_connections
      WHERE doctor_user_id = auth.uid() AND patient_user_id = public.sos_events.patient_user_id
    )
  );
CREATE POLICY "SOS insertable by patient" ON public.sos_events
  FOR INSERT WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY "SOS updatable by patient or doctor" ON public.sos_events
  FOR UPDATE USING (
    auth.uid() = patient_user_id OR
    auth.uid() = doctor_user_id OR
    EXISTS (
      SELECT 1 FROM public.doctor_patient_connections
      WHERE doctor_user_id = auth.uid() AND patient_user_id = public.sos_events.patient_user_id
    )
  );

-- Enable Supabase Realtime for doctor_patient_messages, doctor_patient_connections & sos_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_patient_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_patient_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events;
`;

// Unique Doctor ID generator function: e.g. "NS-DOC-7K4P92"
export function generateDoctorId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NS-DOC-${code}`;
}

// Demo Initial Data (Persistent, standard RFC 4122 v4 UUIDs for PostgreSQL schema compliance)
export const DEFAULT_DOCTOR_ID = "NS-DOC-7K4P92";
export const DEMO_PATIENT_UUID = "d3b07384-d113-4672-8877-c93d9b0f6991";
export const DEMO_DOCTOR_USER_UUID = "e4c18495-e224-4783-9988-da4e0c1f7002";
export const DEMO_DOCTOR_PROFILE_UUID = "f5d29506-f335-4894-aa99-eb5f1d2e8113";

export const INITIAL_DEMO_DOCTOR: DoctorProfile = {
  id: DEMO_DOCTOR_PROFILE_UUID,
  userId: DEMO_DOCTOR_USER_UUID,
  doctorId: DEFAULT_DOCTOR_ID,
  fullName: "Dr. Ananya Sharma",
  specialization: "Neurologist & Cognitive Care Specialist",
  phone: "+91 98201 54321",
  hospitalOrClinic: "Apex Memory & Neurological Health Clinic",
  createdAt: new Date().toISOString(),
};

export const INITIAL_DEMO_PATIENT: UserProfile = {
  id: DEMO_PATIENT_UUID,
  role: "patient",
  fullName: "Sushila Sharma",
  age: 72,
  mobileNumber: "+91 98765 43210",
  email: "sushila.sharma@neurosathi.org",
  connectedDoctorId: DEFAULT_DOCTOR_ID,
  emergencyContactName: "Ramesh Sharma (Son)",
  emergencyContactPhone: "+91 98765 99999",
  medicalNotes: "Mild memory fatigue. Enjoys card games and morning walk.",
  preferredLanguage: "Hindi",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const INITIAL_DEMO_DOCTOR_USER: UserProfile = {
  id: DEMO_DOCTOR_USER_UUID,
  role: "doctor",
  fullName: "Dr. Ananya Sharma",
  age: 44,
  mobileNumber: "+91 98201 54321",
  email: "dr.ananya@apexneuro.com",
  doctorId: DEFAULT_DOCTOR_ID,
  preferredLanguage: "English",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// UUID validation helper for PostgreSQL UUID columns
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

// Sample reminders for initial preview/demo experience
export const DEFAULT_SAMPLE_REMINDERS = (userId: string): ReminderItem[] => [
  {
    id: "sample-rem-1",
    userId,
    title: "Morning Blood Pressure Tablet (Amlodipine 5mg)",
    time: "09:00 AM",
    timeOfDay: "09:00 AM",
    category: "medication",
    isCompleted: false,
    frequency: "daily",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-rem-2",
    userId,
    title: "Gentle Morning Walk in the Garden",
    time: "10:30 AM",
    timeOfDay: "10:30 AM",
    category: "activity",
    isCompleted: true,
    frequency: "daily",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-rem-3",
    userId,
    title: "Hydration Check: Warm Glass of Water",
    time: "02:00 PM",
    timeOfDay: "02:00 PM",
    category: "hydration",
    isCompleted: false,
    frequency: "daily",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-rem-4",
    userId,
    title: "Evening Cognitive Workout on NeuroSathi",
    time: "06:30 PM",
    timeOfDay: "06:30 PM",
    category: "cognitive",
    isCompleted: false,
    frequency: "daily",
    createdAt: new Date().toISOString(),
  },
];

// UI preference storage key (strictly non-critical UI preferences, preserving all existing localStorage)
const PREFERENCE_STORAGE_KEYS = {
  LANGUAGE: "neurosathi_pref_language_v1",
};

/**
 * Unified NeuroSathi Database Service
 * Authoritative Supabase Backend (Auth + PostgreSQL + Realtime).
 * All data operations read and write directly to Supabase tables using auth.uid() and RLS.
 * No silent fallback to localStorage for critical user or medical data.
 */
class NeuroSathiDbService {
  // --- Profile & Authentication ---
  async getCurrentUser(): Promise<UserProfile | null> {
    if (!supabase) {
      throw new Error("Supabase is not initialized. Please verify configuration.");
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return null;
    }

    const authUserId = authData.user.id;
    const meta = authData.user.user_metadata || {};

    const { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUserId)
      .maybeSingle();

    if (profError) {
      console.error("Supabase profile fetch error:", profError.message);
      throw new Error(`Failed to load profile from Supabase: ${profError.message}`);
    }

    if (!profile) {
      // Auto-provision profile from auth metadata if not yet created in profiles table
      const resolvedRole = (meta.role as UserRole) || "patient";
      const generatedDoctorId =
        resolvedRole === "doctor"
          ? meta.doctor_id || generateDoctorId()
          : undefined;

      const newProfile: UserProfile = {
        id: authUserId,
        role: resolvedRole,
        fullName: meta.full_name || authData.user.email?.split("@")[0] || "User",
        age: meta.age ? Number(meta.age) : undefined,
        mobileNumber: meta.mobile_number,
        email: authData.user.email || "",
        doctorId: generatedDoctorId,
        connectedDoctorId: meta.connected_doctor_id,
        specialization: meta.specialization,
        hospital: meta.hospital,
        preferredLanguage: meta.preferred_language || "en",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: insErr } = await supabase.from("profiles").upsert({
        id: newProfile.id,
        role: newProfile.role,
        full_name: newProfile.fullName,
        age: newProfile.age,
        mobile_number: newProfile.mobileNumber,
        email: newProfile.email,
        doctor_id: newProfile.doctorId,
        connected_doctor_id: newProfile.connectedDoctorId,
        preferred_language: newProfile.preferredLanguage,
        updated_at: newProfile.updatedAt,
      });

      if (insErr) {
        throw new Error(`Failed to initialize profile in Supabase: ${insErr.message}`);
      }

      if (newProfile.role === "doctor" && generatedDoctorId) {
        await supabase.from("doctors").upsert({
          user_id: newProfile.id,
          doctor_id: generatedDoctorId,
          full_name: newProfile.fullName,
          specialization: meta.specialization || "Neurology & Cognitive Care",
          phone: newProfile.mobileNumber,
          hospital_or_clinic: meta.hospital || "Apex Memory Clinic",
        }, { onConflict: "doctor_id" });
      }

      if (newProfile.role === "patient") {
        await supabase.from("progress").upsert({
          user_id: newProfile.id,
          overall_score: 80,
          games_played: 0,
          memory_score: 80,
          attention_score: 80,
          problem_solving_score: 80,
          speed_score: 80,
          streak_days: 1,
        }, { onConflict: "user_id" });
      }

      return newProfile;
    }

    // Profile already exists in profiles table
    let doctorId = profile.doctor_id;
    let specialization = meta.specialization;
    let hospital = meta.hospital;
    let connectedDoctorId = profile.connected_doctor_id;

    if (profile.role === "patient" && !connectedDoctorId) {
      // Restore connection from doctor_patient_connections if not synced in profiles
      const { data: connData } = await supabase
        .from("doctor_patient_connections")
        .select("doctor_id_code")
        .eq("patient_user_id", authUserId)
        .eq("status", "active")
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (connData?.doctor_id_code) {
        connectedDoctorId = connData.doctor_id_code;
        await supabase
          .from("profiles")
          .update({ connected_doctor_id: connectedDoctorId })
          .eq("id", authUserId);
      }
    }

    if (profile.role === "doctor") {
      // Restore doctor record and ensure Doctor ID is strictly preserved
      const { data: docData } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (docData) {
        doctorId = docData.doctor_id || doctorId;
        specialization = docData.specialization || specialization;
        hospital = docData.hospital_or_clinic || hospital;

        // Keep profile.doctor_id synced if it was missing or out of sync
        if (profile.doctor_id !== docData.doctor_id) {
          await supabase.from("profiles").update({ doctor_id: docData.doctor_id }).eq("id", authUserId);
        }
      } else {
        // Doctor record missing in doctors table: provision using profile.doctor_id or meta.doctor_id or newly generated
        const resolvedDoctorId = doctorId || meta.doctor_id || generateDoctorId();
        doctorId = resolvedDoctorId;
        specialization = meta.specialization || "Neurology & Cognitive Care";
        hospital = meta.hospital || "Apex Memory Clinic";

        await supabase.from("doctors").upsert({
          user_id: authUserId,
          doctor_id: resolvedDoctorId,
          full_name: profile.full_name,
          specialization,
          phone: profile.mobile_number,
          hospital_or_clinic: hospital,
        }, { onConflict: "doctor_id" });

        if (profile.doctor_id !== resolvedDoctorId) {
          await supabase.from("profiles").update({ doctor_id: resolvedDoctorId }).eq("id", authUserId);
        }
      }
    }

    return {
      id: profile.id,
      role: profile.role,
      fullName: profile.full_name,
      age: profile.age,
      mobileNumber: profile.mobile_number,
      email: profile.email,
      doctorId,
      connectedDoctorId,
      specialization,
      hospital,
      preferredLanguage: profile.preferred_language || "en",
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    if (!isUuid(profile.id)) {
      return profile;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      role: profile.role,
      full_name: profile.fullName,
      age: profile.age,
      mobile_number: profile.mobileNumber,
      email: profile.email,
      doctor_id: profile.doctorId,
      connected_doctor_id: profile.connectedDoctorId,
      preferred_language: profile.preferredLanguage,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase profile save error:", error.message);
      throw new Error(`Supabase profile save failed: ${error.message}`);
    }

    if (profile.role === "doctor" && profile.doctorId) {
      await supabase.from("doctors").upsert({
        user_id: profile.id,
        doctor_id: profile.doctorId,
        full_name: profile.fullName,
        specialization: profile.specialization || "Neurology & Cognitive Care",
        phone: profile.mobileNumber,
        hospital_or_clinic: profile.hospital || "Apex Memory Clinic",
      }, { onConflict: "doctor_id" });
    }

    return profile;
  }

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    return this.saveProfile(profile);
  }

  async signOut(): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase signOut error:", error.message);
        throw new Error(`Supabase signOut failed: ${error.message}`);
      }
    }
  }

  async signUpWithSupabase(params: {
    email: string;
    password?: string;
    fullName: string;
    role: "patient" | "doctor";
    age?: number;
    mobileNumber?: string;
    specialization?: string;
    hospital?: string;
    preferredLanguage?: string;
  }): Promise<{ user: UserProfile | null; error?: string }> {
    if (!supabase) {
      return { user: null, error: "Supabase client is not initialized." };
    }
    if (!params.password) {
      return { user: null, error: "Password is required for Supabase authentication." };
    }

    // Generate unique Doctor ID formatted strictly as NS-DOC-XXXXXX for doctors
    const generatedDoctorId =
      params.role === "doctor"
        ? generateDoctorId()
        : undefined;

    const prefLang = params.preferredLanguage || "en";

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          role: params.role,
          age: params.age,
          mobile_number: params.mobileNumber,
          doctor_id: generatedDoctorId,
          specialization: params.specialization,
          hospital: params.hospital,
          preferred_language: prefLang,
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "No user returned from Supabase Auth." };
    }

    // When an active session is returned immediately (e.g. Email confirmation disabled)
    if (data.session) {
      const newUser: UserProfile = {
        id: data.user.id,
        role: params.role,
        fullName: params.fullName,
        age: params.age,
        mobileNumber: params.mobileNumber,
        email: params.email,
        doctorId: generatedDoctorId,
        specialization: params.specialization,
        hospital: params.hospital,
        preferredLanguage: prefLang,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: profError } = await supabase.from("profiles").upsert({
        id: newUser.id,
        role: newUser.role,
        full_name: newUser.fullName,
        age: newUser.age,
        mobile_number: newUser.mobileNumber,
        email: newUser.email,
        doctor_id: newUser.doctorId,
        preferred_language: newUser.preferredLanguage,
        updated_at: newUser.updatedAt,
      });

      if (profError) {
        return { user: null, error: `Account created, but profile save failed: ${profError.message}` };
      }

      if (params.role === "doctor" && generatedDoctorId) {
        const { error: docError } = await supabase.from("doctors").upsert({
          user_id: data.user.id,
          doctor_id: generatedDoctorId,
          full_name: params.fullName,
          specialization: params.specialization || "Neurology & Cognitive Care",
          phone: params.mobileNumber,
          hospital_or_clinic: params.hospital || "Apex Memory Clinic",
        }, { onConflict: "doctor_id" });

        if (docError) {
          return { user: null, error: `Account created, but doctor registry failed: ${docError.message}` };
        }
      }

      if (params.role === "patient") {
        await supabase.from("progress").upsert({
          user_id: data.user.id,
          overall_score: 80,
          games_played: 0,
          memory_score: 80,
          attention_score: 80,
          problem_solving_score: 80,
          speed_score: 80,
          streak_days: 1,
        }, { onConflict: "user_id" });
      }

      return { user: newUser };
    } else {
      // Email confirmation is active in Supabase Auth settings
      return {
        user: null,
        error: "Account created in Supabase! Please check your email to confirm your account (or disable 'Confirm email' in Supabase Auth Settings to log in immediately).",
      };
    }
  }

  async signInWithSupabase(params: {
    email: string;
    password?: string;
    role: "patient" | "doctor";
  }): Promise<{ user: UserProfile | null; error?: string }> {
    if (!supabase) {
      return { user: null, error: "Supabase client is not initialized." };
    }
    if (!params.password) {
      return { user: null, error: "Password is required for Supabase authentication." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "Supabase login succeeded but no user was returned." };
    }

    const profile = await this.getCurrentUser();
    if (!profile) {
      return { user: null, error: "Authenticated successfully, but failed to load user profile from Supabase." };
    }

    return { user: profile };
  }

  // --- Phone Auth (SMS OTP) Integration ---
  async sendPhoneOtp(params: {
    phone: string;
    fullName?: string;
    role?: "patient" | "doctor";
    age?: number;
    specialization?: string;
    hospital?: string;
    preferredLanguage?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: "Supabase client is not initialized." };
    }

    const cleanPhone = params.phone.replace(/\s+/g, "").trim();
    const generatedDoctorId =
      params.role === "doctor" ? generateDoctorId() : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
      options: {
        data: {
          full_name: params.fullName,
          role: params.role || "patient",
          age: params.age,
          mobile_number: cleanPhone,
          doctor_id: generatedDoctorId,
          specialization: params.specialization,
          hospital: params.hospital,
          preferred_language: params.preferredLanguage || "en",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async verifyPhoneOtp(params: {
    phone: string;
    token: string;
    fullName?: string;
    role?: "patient" | "doctor";
    age?: number;
    specialization?: string;
    hospital?: string;
    preferredLanguage?: string;
  }): Promise<{ user: UserProfile | null; error?: string }> {
    if (!supabase) {
      return { user: null, error: "Supabase client is not initialized." };
    }

    const cleanPhone = params.phone.replace(/\s+/g, "").trim();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token: params.token.trim(),
      type: "sms",
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "No user returned from OTP verification." };
    }

    const profile = await this.getCurrentUser();
    if (!profile) {
      return { user: null, error: "OTP verified, but failed to load profile from Supabase." };
    }

    return { user: profile };
  }

  // --- Doctor Queries ---
  async getDoctorByUserId(userId: string): Promise<DoctorProfile | null> {
    if (!supabase || !isUuid(userId)) {
      return null;
    }

    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Supabase getDoctorByUserId notice:", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      doctorId: data.doctor_id,
      fullName: data.full_name,
      specialization: data.specialization,
      phone: data.phone,
      hospitalOrClinic: data.hospital_or_clinic,
      createdAt: data.created_at,
    };
  }

  // --- Doctor Connection Logic ---
  async getDoctorById(doctorIdCode: string): Promise<DoctorProfile | null> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("doctor_id", doctorIdCode.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      console.error("Supabase doctor query error:", error.message);
      throw new Error(`Failed to query doctor from Supabase: ${error.message}`);
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      doctorId: data.doctor_id,
      fullName: data.full_name,
      specialization: data.specialization,
      phone: data.phone,
      hospitalOrClinic: data.hospital_or_clinic,
      createdAt: data.created_at,
    };
  }

  async connectPatientToDoctor(
    patient: UserProfile,
    doctorIdCode: string
  ): Promise<{ success: boolean; doctor?: DoctorProfile; error?: string }> {
    if (!supabase) {
      return { success: false, error: "Supabase is not initialized." };
    }

    if (!doctorIdCode || !doctorIdCode.trim()) {
      return { success: false, error: "Please enter a valid Doctor ID code (e.g. NS-DOC-7K4P92)." };
    }

    const cleanDoctorCode = doctorIdCode.trim().toUpperCase();
    const doctor = await this.getDoctorById(cleanDoctorCode);
    if (!doctor) {
      return {
        success: false,
        error: `Doctor ID "${cleanDoctorCode}" was not found in Supabase. Please verify with your doctor.`,
      };
    }

    if (!isUuid(patient.id)) {
      return {
        success: false,
        error: "Authenticated patient account required. Please log in or sign up before connecting with a doctor.",
      };
    }

    if (!isUuid(doctor.userId)) {
      return {
        success: false,
        error: "Doctor record is missing a valid Supabase Auth UUID reference.",
      };
    }

    // 1. Update patient's connected_doctor_id in profiles table
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        connected_doctor_id: doctor.doctorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patient.id);

    if (profileErr) {
      return {
        success: false,
        error: `Failed to update patient profile in Supabase: ${profileErr.message}`,
      };
    }

    // 2. Upsert connection record into doctor_patient_connections
    const { error: connErr } = await supabase.from("doctor_patient_connections").upsert(
      {
        doctor_user_id: doctor.userId,
        patient_user_id: patient.id,
        doctor_id_code: doctor.doctorId,
        status: "active",
        patient_name: patient.fullName || "Patient",
        patient_age: patient.age || null,
        patient_phone: patient.mobileNumber || null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "doctor_user_id,patient_user_id" }
    );

    if (connErr) {
      return {
        success: false,
        error: `Failed to link doctor and patient in Supabase: ${connErr.message}`,
      };
    }

    return { success: true, doctor };
  }

  async getConnectedPatients(doctorUserId: string): Promise<DoctorPatientConnection[]> {
    if (!supabase || !isUuid(doctorUserId)) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("doctor_patient_connections")
        .select("*")
        .eq("doctor_user_id", doctorUserId)
        .eq("status", "active")
        .order("connected_at", { ascending: false });

      if (error) {
        console.warn("Supabase getConnectedPatients notice:", error.message);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        doctorUserId: d.doctor_user_id,
        patientUserId: d.patient_user_id,
        doctorIdCode: d.doctor_id_code,
        status: d.status,
        patientName: d.patient_name || "Patient",
        patientAge: d.patient_age,
        patientPhone: d.patient_phone,
        connectedAt: d.connected_at,
      }));
    } catch (err) {
      console.warn("Supabase getConnectedPatients error:", err);
      return [];
    }
  }

  async getPatientConnection(patientUserId: string): Promise<DoctorPatientConnection | null> {
    if (!supabase || !isUuid(patientUserId)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("doctor_patient_connections")
        .select("*")
        .eq("patient_user_id", patientUserId)
        .eq("status", "active")
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        doctorUserId: data.doctor_user_id,
        patientUserId: data.patient_user_id,
        doctorIdCode: data.doctor_id_code,
        status: data.status,
        patientName: data.patient_name || "Patient",
        patientAge: data.patient_age,
        patientPhone: data.patient_phone,
        connectedAt: data.connected_at,
      };
    } catch (err) {
      console.warn("Supabase getPatientConnection error:", err);
      return null;
    }
  }

  // --- Realtime Chat Messages ---
  async getMessages(userA: string, userB: string): Promise<DoctorPatientMessage[]> {
    if (!supabase || !isUuid(userA) || !isUuid(userB)) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("doctor_patient_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Supabase getMessages notice:", error.message);
        return [];
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        messageText: m.message_text,
        isDoctor: m.is_doctor,
        isRead: m.is_read,
        createdAt: m.created_at,
      }));
    } catch (err) {
      console.warn("Supabase getMessages error:", err);
      return [];
    }
  }

  async sendMessage(msg: Omit<DoctorPatientMessage, "id" | "createdAt">): Promise<DoctorPatientMessage> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    if (!isUuid(msg.senderId) || !isUuid(msg.receiverId)) {
      throw new Error("Invalid sender or receiver UUID for database message storage. Both participants must be authenticated Supabase users.");
    }

    const { data, error } = await supabase
      .from("doctor_patient_messages")
      .insert({
        sender_id: msg.senderId,
        receiver_id: msg.receiverId,
        message_text: msg.messageText,
        is_doctor: msg.isDoctor,
        is_read: msg.isRead || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase sendMessage error:", error.message);
      throw new Error(`Failed to deliver message via Supabase: ${error.message}`);
    }

    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      messageText: data.message_text,
      isDoctor: data.is_doctor,
      isRead: data.is_read,
      createdAt: data.created_at,
    };
  }

  // --- Cognitive Game Results & Progress ---
  async saveGameResult(result: Omit<GameResult, "id" | "createdAt">): Promise<GameResult> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    // Resolve real authenticated user ID
    let authenticatedUserId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id && isUuid(authData.user.id)) {
        authenticatedUserId = authData.user.id;
      }
    } catch (e) {
      console.warn("Auth check notice in saveGameResult:", e);
    }

    const effectiveUserId = authenticatedUserId || (isUuid(result.userId) && result.userId !== DEMO_PATIENT_UUID ? result.userId : null);

    if (!effectiveUserId) {
      // Guest or demo user fallback (never used for real authenticated users)
      return {
        id: "game-" + Date.now(),
        userId: result.userId,
        gameId: result.gameId,
        gameName: result.gameName,
        category: result.category,
        score: result.score,
        mistakes: result.mistakes,
        accuracy: Number(result.accuracy),
        difficulty: result.difficulty,
        timeSpentSeconds: result.timeSpentSeconds,
        createdAt: new Date().toISOString(),
      };
    }

    const cleanDifficulty = (["easy", "medium", "hard"].includes(result.difficulty?.toLowerCase())
      ? result.difficulty.toLowerCase()
      : "easy") as "easy" | "medium" | "hard";

    const { data, error } = await supabase
      .from("game_history")
      .insert({
        user_id: effectiveUserId,
        game_id: result.gameId,
        game_name: result.gameName,
        category: result.category,
        score: result.score,
        mistakes: result.mistakes,
        accuracy: Number(result.accuracy),
        difficulty: cleanDifficulty,
        time_spent_seconds: result.timeSpentSeconds,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase saveGameResult error:", error.message);
      throw new Error(`Failed to save game result to Supabase: ${error.message}`);
    }

    // Automatically recalculate and update user progress in Supabase
    await this.recalculateProgress(effectiveUserId);

    return {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      gameName: data.game_name,
      category: data.category,
      score: data.score,
      mistakes: data.mistakes,
      accuracy: Number(data.accuracy),
      difficulty: data.difficulty,
      timeSpentSeconds: data.time_spent_seconds,
      createdAt: data.created_at,
    };
  }

  async getGameHistory(userId: string): Promise<GameResult[]> {
    if (!supabase || !isUuid(userId) || userId === DEMO_PATIENT_UUID) {
      return [];
    }

    const { data, error } = await supabase
      .from("game_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase getGameHistory notice:", error.message);
      return [];
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      gameId: d.game_id,
      gameName: d.game_name,
      category: d.category,
      score: d.score,
      mistakes: d.mistakes,
      accuracy: Number(d.accuracy),
      difficulty: d.difficulty,
      timeSpentSeconds: d.time_spent_seconds,
      createdAt: d.created_at,
    }));
  }

  async getProgress(userId: string): Promise<UserProgress> {
    const demoProgress: UserProgress = {
      userId,
      overallScore: 84,
      gamesPlayed: 5,
      memoryScore: 86,
      attentionScore: 82,
      problemSolvingScore: 84,
      speedScore: 80,
      streakDays: 2,
      lastPlayedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!supabase || !isUuid(userId) || userId === DEMO_PATIENT_UUID) {
      return demoProgress;
    }

    try {
      const { data, error } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Supabase getProgress notice:", error.message);
      }

      if (data) {
        return {
          userId: data.user_id,
          overallScore: data.overall_score,
          gamesPlayed: data.games_played,
          memoryScore: data.memory_score,
          attentionScore: data.attention_score,
          problemSolvingScore: data.problem_solving_score,
          speedScore: data.speed_score,
          streakDays: data.streak_days,
          lastPlayedAt: data.last_played_at,
          updatedAt: data.updated_at,
        };
      }

      // If no progress record exists yet in Supabase for this real user, initialize one with 0 games played
      const initialProgress: UserProgress = {
        userId,
        overallScore: 80,
        gamesPlayed: 0,
        memoryScore: 80,
        attentionScore: 80,
        problemSolvingScore: 80,
        speedScore: 80,
        streakDays: 1,
        lastPlayedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.from("progress").upsert({
        user_id: userId,
        overall_score: 80,
        games_played: 0,
        memory_score: 80,
        attention_score: 80,
        problem_solving_score: 80,
        speed_score: 80,
        streak_days: 1,
      }, { onConflict: "user_id" });

      return initialProgress;
    } catch (err) {
      console.warn("Supabase getProgress error:", err);
      return {
        userId,
        overallScore: 80,
        gamesPlayed: 0,
        memoryScore: 80,
        attentionScore: 80,
        problemSolvingScore: 80,
        speedScore: 80,
        streakDays: 1,
        lastPlayedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  private async recalculateProgress(userId: string): Promise<UserProgress> {
    if (!supabase || !isUuid(userId) || userId === DEMO_PATIENT_UUID) {
      return this.getProgress(userId);
    }

    try {
      const history = await this.getGameHistory(userId);
      const count = history.length;
      if (count === 0) {
        return this.getProgress(userId);
      }

      const memoryGames = history.filter((g) => g.category === "Memory");
      const attentionGames = history.filter((g) => g.category === "Attention");
      const problemGames = history.filter((g) => g.category === "Problem Solving" || g.category === "Language");
      const speedGames = history.filter((g) => g.category === "Motor & Speed" || g.category === "Reflex");

      // Fetch existing progress to preserve existing streaks and baseline
      const existing = await this.getProgress(userId);

      const avg = (arr: GameResult[], defaultVal: number) =>
        arr.length > 0
          ? Math.round(arr.reduce((acc, g) => acc + g.accuracy, 0) / arr.length)
          : defaultVal;

      const memoryScore = avg(memoryGames, existing.memoryScore || 80);
      const attentionScore = avg(attentionGames, existing.attentionScore || 80);
      const problemSolvingScore = avg(problemGames, existing.problemSolvingScore || 80);
      const speedScore = avg(speedGames, existing.speedScore || 80);

      const overallScore = Math.round(
        (memoryScore * 0.35) +
        (attentionScore * 0.25) +
        (problemSolvingScore * 0.2) +
        (speedScore * 0.2)
      );

      const updatedProgress: UserProgress = {
        userId,
        overallScore,
        gamesPlayed: count,
        memoryScore,
        attentionScore,
        problemSolvingScore,
        speedScore,
        streakDays: Math.max(existing.streakDays, 1),
        lastPlayedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase.from("progress").upsert(
        {
          user_id: userId,
          overall_score: overallScore,
          games_played: count,
          memory_score: memoryScore,
          attention_score: attentionScore,
          problem_solving_score: problemSolvingScore,
          speed_score: speedScore,
          streak_days: updatedProgress.streakDays,
          last_played_at: updatedProgress.lastPlayedAt,
          updated_at: updatedProgress.updatedAt,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.warn("Supabase progress upsert error:", error.message);
      }

      return updatedProgress;
    } catch (err) {
      console.warn("Recalculate progress exception:", err);
      return this.getProgress(userId);
    }
  }

  // --- Reminders ---
  async getReminders(userId: string): Promise<ReminderItem[]> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    if (!isUuid(userId) || userId === DEMO_PATIENT_UUID) {
      return DEFAULT_SAMPLE_REMINDERS(userId);
    }

    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Supabase getReminders notice:", error.message);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        time: r.time,
        timeOfDay: r.time,
        category: r.category,
        isCompleted: r.is_completed,
        frequency: r.frequency,
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.warn("Supabase getReminders error:", err);
      return [];
    }
  }

  async toggleReminder(id: string, isCompleted: boolean): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    if (!isUuid(id)) {
      return;
    }

    const { error } = await supabase
      .from("reminders")
      .update({ is_completed: isCompleted })
      .eq("id", id);

    if (error) {
      console.error("Supabase toggleReminder error:", error.message);
      throw new Error(`Failed to update reminder in Supabase: ${error.message}`);
    }
  }

  async addReminder(reminder: Omit<ReminderItem, "id" | "createdAt">): Promise<ReminderItem> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    const timeVal = reminder.time || reminder.timeOfDay || "10:00 AM";

    // Detect if authenticated
    let effectiveUserId = reminder.userId;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id && isUuid(authData.user.id)) {
        effectiveUserId = authData.user.id;
      }
    } catch (e) {
      console.warn("Auth check notice in addReminder:", e);
    }

    if (!isUuid(effectiveUserId) || effectiveUserId === DEMO_PATIENT_UUID) {
      return {
        id: "rem-" + Date.now(),
        userId: effectiveUserId,
        title: reminder.title,
        time: timeVal,
        timeOfDay: timeVal,
        category: reminder.category || "medication",
        isCompleted: reminder.isCompleted || false,
        frequency: reminder.frequency || "daily",
        createdAt: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        user_id: effectiveUserId,
        title: reminder.title,
        time: timeVal,
        category: reminder.category || "medication",
        is_completed: reminder.isCompleted || false,
        frequency: reminder.frequency || "daily",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase addReminder error:", error.message);
      throw new Error(`Failed to save reminder to Supabase: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      time: data.time,
      timeOfDay: data.time,
      category: data.category,
      isCompleted: data.is_completed,
      frequency: data.frequency,
      createdAt: data.created_at,
    };
  }

  // --- SOS Events ---
  async triggerSos(patient: UserProfile, message?: string): Promise<SosEvent> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    let authPatientId = patient.id;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id && isUuid(authData.user.id)) {
        authPatientId = authData.user.id;
      }
    } catch (e) {
      console.warn("Auth check in triggerSos:", e);
    }

    // Resolve connected doctor's UUID
    let docUserId: string | null = null;
    let doctorCode = patient.connectedDoctorId;
    if (!doctorCode && isUuid(authPatientId)) {
      const conn = await this.getPatientConnection(authPatientId);
      if (conn?.doctorUserId) {
        docUserId = conn.doctorUserId;
        doctorCode = conn.doctorIdCode;
      }
    }
    if (!docUserId && doctorCode) {
      const doctor = await this.getDoctorById(doctorCode);
      if (doctor?.userId && isUuid(doctor.userId)) {
        docUserId = doctor.userId;
      }
    }

    if (!isUuid(authPatientId) || authPatientId === DEMO_PATIENT_UUID) {
      // Demo mode fallback
      return {
        id: "sos-" + Date.now(),
        patientUserId: authPatientId,
        patientName: patient.fullName,
        patientPhone: patient.mobileNumber,
        doctorUserId: docUserId,
        status: "active",
        message: message || "Emergency SOS alert dispatched from NeuroSathi home interface.",
        createdAt: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("sos_events")
      .insert({
        patient_user_id: authPatientId,
        patient_name: patient.fullName || "Patient",
        patient_phone: patient.mobileNumber || null,
        doctor_user_id: docUserId,
        status: "active",
        message: message || "Emergency SOS alert dispatched from NeuroSathi home interface.",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase triggerSos error:", error.message);
      throw new Error(`Failed to dispatch SOS alert to Supabase: ${error.message}`);
    }

    return {
      id: data.id,
      patientUserId: data.patient_user_id,
      patientName: data.patient_name,
      patientPhone: data.patient_phone,
      doctorUserId: data.doctor_user_id,
      status: data.status,
      message: data.message,
      createdAt: data.created_at,
    };
  }

  async getSosEvents(forDoctorUserId?: string): Promise<SosEvent[]> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }

    try {
      let query = supabase.from("sos_events").select("*").order("created_at", { ascending: false });
      if (forDoctorUserId && isUuid(forDoctorUserId)) {
        query = query.or(`doctor_user_id.eq.${forDoctorUserId},doctor_user_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase getSosEvents notice:", error.message);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        patientUserId: s.patient_user_id,
        patientName: s.patient_name,
        patientPhone: s.patient_phone,
        doctorUserId: s.doctor_user_id,
        status: s.status,
        message: s.message,
        createdAt: s.created_at,
      }));
    } catch (err) {
      console.warn("Supabase getSosEvents error:", err);
      return [];
    }
  }

  async resolveSos(id: string): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not initialized.");
    }
    if (!isUuid(id)) return;

    try {
      const { error } = await supabase.from("sos_events").update({ status: "resolved" }).eq("id", id);
      if (error) {
        console.warn("Supabase resolveSos notice:", error.message);
      }
    } catch (err) {
      console.warn("Supabase resolveSos error:", err);
    }
  }

  // --- AI Chat History ---
  async saveAiMessage(
    userId: string,
    role: "user" | "model",
    message: string,
    language: string,
    launchGame?: any
  ): Promise<void> {
    if (!supabase || !isUuid(userId)) {
      return;
    }

    try {
      const { error } = await supabase.from("ai_history").insert({
        user_id: userId,
        role,
        message,
        language,
      });

      if (error) {
        console.warn("Supabase saveAiMessage notice:", error.message);
      }
    } catch (err) {
      console.warn("Supabase saveAiMessage error:", err);
    }
  }

  async getAiHistory(userId: string): Promise<AiChatMessage[]> {
    if (!supabase || !isUuid(userId)) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("ai_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.warn("Supabase getAiHistory notice:", error.message);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        role: d.role,
        message: d.message,
        language: d.language,
        createdAt: d.created_at,
      }));
    } catch (err) {
      console.warn("Supabase getAiHistory error:", err);
      return [];
    }
  }
}

export const neurosathiDb = new NeuroSathiDbService();
