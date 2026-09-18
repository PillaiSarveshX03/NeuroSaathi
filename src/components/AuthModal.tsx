import React, { useState } from "react";
import { UserRole, UserProfile } from "../types";
import { neurosathiDb } from "../lib/supabase";
import { playClickSound, playSuccessSound, playMistakeSound } from "../lib/audio";
import {
  Stethoscope,
  User,
  HeartPulse,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  X,
} from "lucide-react";

interface Props {
  onSuccess: (user: UserProfile) => void;
  onCancel?: () => void;
  preferredLanguage?: string;
}

export const AuthModal: React.FC<Props> = ({ onSuccess, onCancel, preferredLanguage }) => {
  const [role, setRole] = useState<UserRole>("patient");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "phone_otp">("password");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [specialization, setSpecialization] = useState("Neurology & Cognitive Care");
  const [hospital, setHospital] = useState("Apex Memory Clinic");

  // Phone Auth OTP states
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (authMethod === "phone_otp") {
        if (!mobileNumber.trim()) {
          setErrorMsg("Please enter a valid mobile number with country code (e.g. +91 98234 11223).");
          setLoading(false);
          return;
        }

        if (!otpSent) {
          // Step 1: Send OTP to Phone
          const res = await neurosathiDb.sendPhoneOtp({
            phone: mobileNumber.trim(),
            fullName: isSignUp ? fullName.trim() : undefined,
            role,
            age: age ? parseInt(age, 10) : undefined,
            specialization: role === "doctor" ? specialization : undefined,
            hospital: role === "doctor" ? hospital : undefined,
            preferredLanguage,
          });

          if (res.success) {
            playSuccessSound();
            setOtpSent(true);
            setOtpSuccessMsg(`Verification code sent to ${mobileNumber.trim()}. Enter the 6-digit code below.`);
          } else {
            playMistakeSound();
            setErrorMsg(res.error || "Failed to send OTP. Ensure mobile phone authentication is enabled.");
          }
        } else {
          // Step 2: Verify OTP
          if (!otpCode.trim()) {
            setErrorMsg("Please enter the 6-digit verification code sent to your phone.");
            setLoading(false);
            return;
          }

          const res = await neurosathiDb.verifyPhoneOtp({
            phone: mobileNumber.trim(),
            token: otpCode.trim(),
            fullName: isSignUp ? fullName.trim() : undefined,
            role,
            age: age ? parseInt(age, 10) : undefined,
            specialization: role === "doctor" ? specialization : undefined,
            hospital: role === "doctor" ? hospital : undefined,
            preferredLanguage,
          });

          if (res.user) {
            playSuccessSound();
            onSuccess(res.user);
          } else {
            playMistakeSound();
            setErrorMsg(res.error || "Invalid or expired verification code.");
          }
        }
      } else {
        // Standard Email & Password Auth
        if (isSignUp) {
          if (role === "doctor" && !mobileNumber.trim()) {
            setErrorMsg("Mobile number is required for doctor registration.");
            setLoading(false);
            return;
          }

          if (role === "patient" && !age.trim()) {
            setErrorMsg("Age is required for patient registration.");
            setLoading(false);
            return;
          }

          if (role === "patient" && !mobileNumber.trim()) {
            setErrorMsg("Mobile number is required for patient registration.");
            setLoading(false);
            return;
          }

          const res = await neurosathiDb.signUpWithSupabase({
            email,
            password,
            fullName: fullName.trim(),
            role,
            age: age ? parseInt(age, 10) : undefined,
            mobileNumber: mobileNumber.trim(),
            specialization: role === "doctor" ? specialization : undefined,
            hospital: role === "doctor" ? hospital : undefined,
            preferredLanguage,
          });

          if (res.user) {
            playSuccessSound();
            onSuccess(res.user);
          } else {
            playMistakeSound();
            setErrorMsg(res.error || "Signup could not be completed.");
          }
        } else {
          const res = await neurosathiDb.signInWithSupabase({
            email,
            password,
            role,
          });

          if (res.user) {
            playSuccessSound();
            onSuccess(res.user);
          } else {
            playMistakeSound();
            setErrorMsg(res.error || "Login failed. Please check your credentials.");
          }
        }
      }
    } catch (err: any) {
      console.error("Auth error", err);
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoRole: UserRole) => {
    playClickSound();
    setRole(demoRole);
    setAuthMethod("password");
    setOtpSent(false);
    setErrorMsg(null);
    if (demoRole === "patient") {
      setEmail("patient@neurosathi.org");
      setPassword("Patient@1234");
      setFullName("Sushila Sharma");
      setAge("72");
      setMobileNumber("+91 98765 43210");
    } else {
      setEmail("doctor@neurosathi.org");
      setPassword("Doctor@1234");
      setFullName("Dr. Arvind Mehta");
      setMobileNumber("+91 98234 11223");
      setSpecialization("Neurology & Geriatrics");
      setHospital("Apex Memory Clinic");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-200 my-auto relative">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            NeuroSathi
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cognitive Care & Companion Platform
          </p>
        </div>

        {/* Role Switcher Tab */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setRole("patient");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === "patient"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient Portal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setRole("doctor");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === "doctor"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Portal</span>
          </button>
        </div>

        {/* Auth Method Switcher: Password vs Phone OTP */}
        <div className="flex items-center justify-center gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod("password");
              setOtpSent(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMethod === "password"
                ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email & Password</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod("phone_otp");
              setOtpSent(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMethod === "phone_otp"
                ? "bg-white text-teal-800 font-bold shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone Auth (OTP)</span>
          </button>
        </div>

        {/* Toggle Login vs Signup */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            {isSignUp
              ? `Register ${role === "doctor" ? "Doctor" : "Patient"}`
              : `Sign in as ${role === "doctor" ? "Doctor" : "Patient"}`}
          </h3>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsSignUp(!isSignUp);
              setOtpSent(false);
              setErrorMsg(null);
            }}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            {isSignUp ? "Already registered? Sign in" : "New? Create account"}
          </button>
        </div>

        {/* Doctor ID Unique Generation Notice during signup */}
        {isSignUp && role === "doctor" && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs font-medium mb-3.5 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>
              A unique <strong>Doctor ID (e.g. NS-DOC-7K4P92)</strong> will be generated and registered. Patients use this code to connect with your clinic.
            </span>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold mb-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            {errorMsg.toLowerCase().includes("confirm") && (
              <p className="text-rose-900 font-bold pl-6 text-[11px]">
                Tip: Disable email confirmation requirement in your authentication settings for immediate sign-in.
              </p>
            )}
            {errorMsg.toLowerCase().includes("phone") && (
              <p className="text-rose-900 font-bold pl-6 text-[11px]">
                Tip: If Mobile Phone Auth is not enabled, switch to the &quot;Email & Password&quot; tab above.
              </p>
            )}
          </div>
        )}

        {/* OTP Sent Success Message */}
        {otpSuccessMsg && !errorMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold mb-3.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{otpSuccessMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Sign Up Fields */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {role === "doctor" ? "Doctor Full Name *" : "Patient Full Name *"}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === "doctor" ? "e.g. Dr. Arvind Mehta" : "e.g. Sushila Sharma"}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-sm font-semibold"
              />
            </div>
          )}

          {/* Patient Specific: Age */}
          {isSignUp && role === "patient" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age *</label>
              <input
                type="number"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 72"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-sm font-semibold"
              />
            </div>
          )}

          {/* Mobile Number Field (Mandatory for Doctor Signup, and for Phone OTP mode) */}
          {(authMethod === "phone_otp" || (isSignUp && role === "doctor") || (isSignUp && role === "patient")) && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {role === "doctor" ? "Doctor Mobile Number *" : "Mobile Number *"}
              </label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91 98234 11223"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-sm font-semibold"
              />
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                Include country code (e.g. +91, +1)
              </span>
            </div>
          )}

          {/* Doctor Specific Signup Fields: Specialization & Hospital/Clinic */}
          {isSignUp && role === "doctor" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Neurology & Geriatrics"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinic / Hospital</label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="Apex Memory Clinic"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                />
              </div>
            </div>
          )}

          {/* Email & Password Mode */}
          {authMethod === "password" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "doctor" ? "doctor@clinic.com" : "patient@example.com"}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 text-sm font-semibold"
                />
              </div>
            </>
          )}

          {/* Phone OTP Mode Code Input */}
          {authMethod === "phone_otp" && otpSent && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                6-Digit Verification Code (OTP) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 text-center tracking-widest font-mono text-lg font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3 rounded-2xl text-white font-extrabold text-sm shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50 ${
              role === "doctor"
                ? "bg-teal-700 hover:bg-teal-800"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading
              ? "Connecting..."
              : authMethod === "phone_otp"
              ? otpSent
                ? "Verify OTP & Complete"
                : "Send OTP Verification Code"
              : isSignUp
              ? role === "doctor"
                ? "Register Doctor & Get ID"
                : "Create Account & Start"
              : `Sign In as ${role === "doctor" ? "Doctor" : "Patient"}`}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block text-center mb-2">
            Fill Demo Credentials For Testing
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("patient")}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-blue-700" />
              <span>Fill Patient Demo</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("doctor")}
              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xs border border-teal-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
              <span>Fill Doctor Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

