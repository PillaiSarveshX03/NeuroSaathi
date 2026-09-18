import React, { useState, useEffect, useRef } from "react";
import {
  UserProfile,
  DoctorProfile,
  DoctorPatientConnection,
  DoctorPatientMessage,
  UserProgress,
  SosEvent,
  GameResult,
} from "../types";
import { neurosathiDb, supabase, isUuid } from "../lib/supabase";
import { playClickSound, playSuccessSound, playMistakeSound, playSosAlertSound } from "../lib/audio";
import {
  Stethoscope,
  Users,
  Send,
  UserCheck,
  Phone,
  Building2,
  Copy,
  Check,
  AlertTriangle,
  Brain,
  ShieldAlert,
  BellRing,
  History,
} from "lucide-react";

interface Props {
  currentUser: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
  onOpenSosModal: () => void;
}

export const DoctorPatientView: React.FC<Props> = ({
  currentUser,
  onProfileUpdate,
  onOpenSosModal,
}) => {
  const isDoctor = currentUser.role === "doctor";

  // Patient states
  const [doctorIdInput, setDoctorIdInput] = useState("");
  const [connectedDoctor, setConnectedDoctor] = useState<DoctorProfile | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // Doctor states
  const [connectedPatients, setConnectedPatients] = useState<DoctorPatientConnection[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientConnection | null>(null);
  const [selectedPatientProgress, setSelectedPatientProgress] = useState<UserProgress | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<GameResult[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosEvent[]>([]);
  const [copiedDoctorId, setCopiedDoctorId] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isDoctor) {
      loadDoctorDashboard();
    } else {
      loadPatientDoctor();
    }
  }, [currentUser.id, currentUser.connectedDoctorId, currentUser.role]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription setup for messages & SOS alerts
  useEffect(() => {
    if (!supabase) return;

    const msgChannel = supabase
      .channel("doctor_patient_messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "doctor_patient_messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (
            newMsg &&
            (newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [
                ...prev,
                {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  receiverId: newMsg.receiver_id,
                  messageText: newMsg.message_text,
                  isDoctor: newMsg.is_doctor,
                  isRead: newMsg.is_read,
                  createdAt: newMsg.created_at,
                },
              ];
            });
          }
        }
      )
      .subscribe();

    const sosChannel = supabase
      .channel("doctor_patient_sos_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sos_events",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newSos = payload.new as any;
            if (newSos) {
              setSosAlerts((prev) => [
                {
                  id: newSos.id,
                  patientUserId: newSos.patient_user_id,
                  patientName: newSos.patient_name,
                  patientPhone: newSos.patient_phone,
                  doctorUserId: newSos.doctor_user_id,
                  status: newSos.status,
                  message: newSos.message,
                  createdAt: newSos.created_at,
                },
                ...prev.filter((s) => s.id !== newSos.id),
              ]);
              if (newSos.status === "active") {
                playSosAlertSound();
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            if (updated) {
              setSosAlerts((prev) =>
                prev.map((s) =>
                  s.id === updated.id
                    ? {
                        ...s,
                        status: updated.status,
                        message: updated.message,
                      }
                    : s
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(sosChannel);
    };
  }, [currentUser.id]);

  const loadPatientDoctor = async () => {
    let doctorIdToLoad = currentUser.connectedDoctorId;
    if (!doctorIdToLoad && currentUser.id && isUuid(currentUser.id)) {
      const activeConn = await neurosathiDb.getPatientConnection(currentUser.id);
      if (activeConn?.doctorIdCode) {
        doctorIdToLoad = activeConn.doctorIdCode;
        onProfileUpdate({ ...currentUser, connectedDoctorId: doctorIdToLoad });
      }
    }

    if (doctorIdToLoad) {
      const doc = await neurosathiDb.getDoctorById(doctorIdToLoad);
      setConnectedDoctor(doc);
      if (doc) {
        loadMessages(currentUser.id, doc.userId);
      }
    }
  };

  const loadDoctorDashboard = async () => {
    if (!currentUser.doctorId) {
      const doc = await neurosathiDb.getDoctorByUserId(currentUser.id);
      if (doc?.doctorId) {
        onProfileUpdate({ ...currentUser, doctorId: doc.doctorId });
      }
    }

    const [patients, alerts] = await Promise.all([
      neurosathiDb.getConnectedPatients(currentUser.id),
      neurosathiDb.getSosEvents(currentUser.id),
    ]);
    setConnectedPatients(patients);
    setSosAlerts(alerts);

    if (patients.length > 0) {
      const first = patients[0];
      setSelectedPatient(first);
      loadMessages(currentUser.id, first.patientUserId);
      const [prog, hist] = await Promise.all([
        neurosathiDb.getProgress(first.patientUserId),
        neurosathiDb.getGameHistory(first.patientUserId),
      ]);
      setSelectedPatientProgress(prog);
      setSelectedPatientHistory(hist);
    }
  };

  const loadMessages = async (userA: string, userB: string) => {
    const msgList = await neurosathiDb.getMessages(userA, userB);
    setMessages(msgList);
  };

  const handleConnectDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccess(null);
    playClickSound();

    if (!doctorIdInput.trim()) {
      setConnectError("Please enter a valid Doctor ID (e.g. NS-DOC-7K4P92).");
      return;
    }

    const res = await neurosathiDb.connectPatientToDoctor(currentUser, doctorIdInput.trim());
    if (res.success && res.doctor) {
      playSuccessSound();
      setConnectedDoctor(res.doctor);
      setConnectSuccess(`Successfully connected with ${res.doctor.fullName}!`);
      onProfileUpdate({
        ...currentUser,
        connectedDoctorId: res.doctor.doctorId,
      });
      loadMessages(currentUser.id, res.doctor.userId);
    } else {
      playMistakeSound();
      setConnectError(res.error || "Doctor ID not found. Please verify with your doctor.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || isSending) return;

    const targetUserId = isDoctor
      ? selectedPatient?.patientUserId
      : connectedDoctor?.userId;

    if (!targetUserId) return;

    playClickSound();
    setIsSending(true);
    setSendError(null);

    try {
      const msg = await neurosathiDb.sendMessage({
        senderId: currentUser.id,
        receiverId: targetUserId,
        messageText: newMessageText.trim(),
        isDoctor,
        isRead: false,
      });

      setMessages((prev) => [...prev, msg]);
      setNewMessageText("");
      playSuccessSound();
    } catch (err: any) {
      console.error("Failed to send message via Supabase", err);
      setSendError(err.message || "Failed to deliver message via secure cloud.");
      playMistakeSound();
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectPatient = async (p: DoctorPatientConnection) => {
    playClickSound();
    setSelectedPatient(p);
    loadMessages(currentUser.id, p.patientUserId);
    const [prog, hist] = await Promise.all([
      neurosathiDb.getProgress(p.patientUserId),
      neurosathiDb.getGameHistory(p.patientUserId),
    ]);
    setSelectedPatientProgress(prog);
    setSelectedPatientHistory(hist);
  };

  const handleResolveSos = async (sosId: string) => {
    playClickSound();
    try {
      await neurosathiDb.resolveSos(sosId);
      setSosAlerts((prev) =>
        prev.map((s) => (s.id === sosId ? { ...s, status: "resolved" } : s))
      );
      playSuccessSound();
    } catch (e) {
      console.error("Resolve SOS error:", e);
    }
  };

  const handleCopyDoctorId = () => {
    playClickSound();
    if (currentUser.doctorId) {
      navigator.clipboard.writeText(currentUser.doctorId);
      setCopiedDoctorId(true);
      setTimeout(() => setCopiedDoctorId(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* ===================== DOCTOR VIEW ===================== */}
      {isDoctor ? (
        <div className="space-y-6">
          {/* Doctor Header Banner */}
          <div className="bg-[#074738] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#043328] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-black mb-1 text-sm sm:text-base">
                <Stethoscope className="w-5 h-5 text-amber-300" />
                <span>PHYSICIAN PORTAL</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">{currentUser.fullName}</h1>
              <p className="text-emerald-100 text-base font-semibold mt-1">
                Cognitive Care & Remote Patient Consultation
              </p>
            </div>

            {/* Doctor ID Card */}
            <div className="bg-[#043328]/90 p-4 sm:p-5 rounded-2xl border-2 border-amber-400/30 flex flex-col items-start md:items-end">
              <span className="text-xs uppercase font-black text-amber-300 tracking-wider">Your Unique Doctor ID</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-mono font-black text-white tracking-wider">
                  {currentUser.doctorId || "Syncing Doctor ID..."}
                </span>
                <button
                  id="copy-doctor-id-btn"
                  onClick={handleCopyDoctorId}
                  className="p-2.5 rounded-xl bg-[#0d6e5a] hover:bg-[#065f46] text-white cursor-pointer transition-colors shadow-xs"
                  title="Copy Doctor ID"
                >
                  {copiedDoctorId ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <span className="text-xs font-bold text-emerald-100 mt-1">Patients use this code to link with you</span>
            </div>
          </div>

          {/* Active SOS Emergency Alerts Panel for Doctor */}
          {sosAlerts.some((s) => s.status === "active") && (
            <div className="bg-rose-50 border-2 border-rose-600 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-rose-900 font-black text-lg">
                  <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
                  <span>URGENT: Patient Emergency SOS Signals ({sosAlerts.filter((s) => s.status === "active").length})</span>
                </div>
                <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-rose-600 text-white uppercase tracking-wider">
                  Realtime Alert
                </span>
              </div>

              <div className="space-y-3">
                {sosAlerts
                  .filter((s) => s.status === "active")
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white p-4 rounded-2xl border-2 border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-base">{alert.patientName}</span>
                          {alert.patientPhone && (
                            <a
                              href={`tel:${alert.patientPhone}`}
                              className="text-xs font-black text-blue-800 bg-blue-100 px-2.5 py-1 rounded-md hover:underline"
                            >
                              📞 {alert.patientPhone}
                            </a>
                          )}
                        </div>
                        <p className="text-slate-800 font-bold text-sm mt-0.5">{alert.message}</p>
                        <span className="text-xs font-semibold text-slate-600">
                          Dispatched at {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <button
                        id={`resolve-sos-${alert.id}`}
                        onClick={() => handleResolveSos(alert.id)}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        ✓ Acknowledge & Resolve
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Doctor Dashboard Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Patient Roster */}
            <div className="lg:col-span-4 bg-white rounded-3xl border-2 border-slate-300 p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#074738]" />
                  Connected Patients ({connectedPatients.length})
                </h3>
              </div>

              {connectedPatients.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-500">
                  <p className="font-semibold text-base">No patients linked yet.</p>
                  <p className="text-xs mt-1">Share your Doctor ID code with patients.</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[500px]">
                  {connectedPatients.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        id={`select-patient-${p.id}`}
                        onClick={() => handleSelectPatient(p)}
                        className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-teal-50/70 border-teal-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 border-transparent"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{p.patientName}</h4>
                          <p className="text-xs text-slate-500">
                            Age: {p.patientAge || "N/A"} • {p.patientPhone || "No phone"}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Patient Details & Realtime Chat */}
            <div className="lg:col-span-8 space-y-6">
              {selectedPatient ? (
                <>
                  {/* Selected Patient Quick Health Bar */}
                  {selectedPatientProgress && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-500">Patient File</span>
                        <h3 className="text-xl font-bold text-slate-900">{selectedPatient.patientName}</h3>
                        <p className="text-xs text-slate-500">
                          Connected on {new Date(selectedPatient.connectedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-500">Cognitive Score</span>
                          <div className="text-2xl font-black text-teal-700">
                            {selectedPatientProgress.overallScore}/100
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-500">Games Completed</span>
                          <div className="text-2xl font-black text-slate-800">
                            {selectedPatientProgress.gamesPlayed}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-500">Daily Streak</span>
                          <div className="text-2xl font-black text-amber-600">
                            {selectedPatientProgress.streakDays} days
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Realtime Chat Console */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[460px]">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <span>💬 Direct Medical Chat with {selectedPatient.patientName}</span>
                      </h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        PostgreSQL Realtime Active
                      </span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">
                          No messages exchanged with {selectedPatient.patientName} yet. Send a greeting!
                        </div>
                      ) : (
                        messages.map((m) => {
                          const isSentByDoctor = m.isDoctor;
                          return (
                            <div
                              key={m.id}
                              className={`flex ${isSentByDoctor ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] p-3.5 rounded-2xl text-base shadow-xs ${
                                  isSentByDoctor
                                    ? "bg-teal-700 text-white rounded-br-xs"
                                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                                }`}
                              >
                                <div>{m.messageText}</div>
                                <span
                                  className={`text-[10px] block mt-1 ${
                                    isSentByDoctor ? "text-teal-200" : "text-slate-400"
                                  }`}
                                >
                                  {new Date(m.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatScrollRef} />
                    </div>

                    {sendError && (
                      <div className="px-3 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs font-semibold">
                        ⚠️ Message delivery error: {sendError}
                      </div>
                    )}
                    {/* Message Input Form */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex gap-2">
                      <input
                        type="text"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        placeholder={`Message ${selectedPatient.patientName}...`}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 focus:outline-none focus:border-teal-600 text-base"
                      />
                      <button
                        type="submit"
                        disabled={!newMessageText.trim() || isSending}
                        className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Send</span>
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                  {/* Patient Cognitive Games History Log (Real Supabase Records) */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-teal-700" />
                        <span>Cognitive Activity History ({selectedPatientHistory.length})</span>
                      </h4>
                      <span className="text-xs text-slate-500 font-semibold">Cognitive History</span>
                    </div>

                    {selectedPatientHistory.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">
                        No games completed yet by this patient.
                      </p>
                    ) : (
                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-left text-xs text-slate-700">
                          <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Game</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Difficulty</th>
                              <th className="py-2.5 px-3">Score</th>
                              <th className="py-2.5 px-3">Accuracy</th>
                              <th className="py-2.5 px-3">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedPatientHistory.slice(0, 10).map((g) => (
                              <tr key={g.id} className="hover:bg-slate-50/80">
                                <td className="py-2 px-3 font-semibold text-slate-900">{g.gameName}</td>
                                <td className="py-2 px-3 text-slate-600">{g.category}</td>
                                <td className="py-2 px-3 uppercase font-bold text-teal-700">{g.difficulty}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{g.score}</td>
                                <td className="py-2 px-3 font-semibold text-emerald-700">{g.accuracy}%</td>
                                <td className="py-2 px-3 text-slate-400">
                                  {new Date(g.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
                  <UserCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-slate-800">No Patient Selected</h3>
                  <p className="text-sm mt-1">Select a patient from the left roster to view their cognitive stats and chat.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ===================== PATIENT VIEW ===================== */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-[#074738] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#043328] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-black mb-1 text-sm sm:text-base">
                <Stethoscope className="w-5 h-5 text-amber-300" />
                <span>YOUR DOCTOR CONSULTATION</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Doctor & Health Partner</h1>
              <p className="text-emerald-100 text-base font-semibold mt-1">
                Stay in direct, continuous contact with your treating physician.
              </p>
            </div>

            {/* Emergency SOS Shortcut button */}
            <button
              id="patient-sos-btn-shortcut"
              onClick={onOpenSosModal}
              className="px-7 py-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-lg rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2.5 active:scale-95 shrink-0 border-2 border-red-500"
            >
              <AlertTriangle className="w-6 h-6" />
              <span>EMERGENCY SOS</span>
            </button>
          </div>

          {/* Connected Doctor Card or Connect Form */}
          {connectedDoctor ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Doctor Card */}
              <div className="lg:col-span-4 bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-[#e8fbf6] border-2 border-[#a7f0df] text-[#074738] flex items-center justify-center text-3xl mb-4 shadow-xs">
                    🩺
                  </div>
                  <span className="text-xs uppercase font-black text-[#065f46] tracking-wider">
                    Connected Physician
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">{connectedDoctor.fullName}</h3>
                  <p className="text-[#0d6e5a] font-bold text-base mt-0.5">
                    {connectedDoctor.specialization}
                  </p>

                  <div className="mt-6 space-y-3.5 text-base text-slate-700 font-semibold">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
                      <span>{connectedDoctor.hospitalOrClinic || "Apex Cognitive Health Clinic"}</span>
                    </div>
                    {connectedDoctor.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                        <span className="font-bold text-slate-900">{connectedDoctor.phone}</span>
                      </div>
                    )}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200">
                      <span className="text-xs font-black uppercase text-slate-500 block">Doctor ID Code</span>
                      <strong className="text-slate-900 font-mono text-lg font-black">{connectedDoctor.doctorId}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t-2 border-slate-100">
                  <span className="text-sm text-emerald-800 font-black flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    Verified Physician Connection
                  </span>
                </div>
              </div>

              {/* Right: Realtime Chat with Doctor */}
              <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-slate-300 shadow-xs flex flex-col h-[520px]">
                <div className="p-5 border-b-2 border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-xl">
                      Chat with {connectedDoctor.fullName}
                    </h4>
                    <span className="text-xs sm:text-sm font-bold text-slate-600">Real-time consultation & health updates</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Online
                  </span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-slate-50/50">
                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 font-bold text-base">
                      You are connected! Say hello to {connectedDoctor.fullName}.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = !m.isDoctor;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-4 rounded-3xl text-base sm:text-lg shadow-xs leading-relaxed font-bold ${
                              isMe
                                ? "bg-[#074738] text-white rounded-br-xs"
                                : "bg-white text-slate-900 border-2 border-slate-300 rounded-bl-xs"
                            }`}
                          >
                            <div>{m.messageText}</div>
                            <span
                              className={`text-xs block mt-1.5 font-semibold ${
                                isMe ? "text-emerald-200" : "text-slate-500"
                              }`}
                            >
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatScrollRef} />
                </div>

                {sendError && (
                  <div className="px-4 py-2 bg-rose-50 border-t-2 border-rose-200 text-rose-900 text-xs font-bold">
                    ⚠️ Message delivery error: {sendError}
                  </div>
                )}
                {/* Input Box */}
                <form onSubmit={handleSendMessage} className="p-3 border-t-2 border-slate-200 flex gap-2.5">
                  <input
                    id="patient-to-doctor-msg-input"
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type a question for your doctor..."
                    className="flex-1 px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-[#074738] text-base"
                  />
                  <button
                    id="patient-send-doctor-msg-btn"
                    type="submit"
                    disabled={!newMessageText.trim() || isSending}
                    className="px-6 py-3.5 rounded-2xl bg-[#074738] hover:bg-[#043328] disabled:opacity-50 text-white font-black transition-all cursor-pointer flex items-center gap-2 text-base shadow-xs active:scale-95"
                  >
                    <span>Send</span>
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Not connected yet: Connection Prompt */
            <div className="bg-white rounded-3xl border-2 border-slate-300 p-8 sm:p-12 max-w-2xl mx-auto shadow-sm text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#e8fbf6] border-2 border-[#a7f0df] text-[#074738] flex items-center justify-center text-4xl mx-auto mb-4">
                🩺
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Connect with your Doctor
              </h2>
              <p className="text-slate-700 font-semibold text-base sm:text-lg mt-2 max-w-md mx-auto leading-relaxed">
                Enter the unique Doctor ID provided by your physician to enable secure chat and instant SOS alerts.
              </p>

              <form onSubmit={handleConnectDoctor} className="mt-8 max-w-md mx-auto space-y-4">
                <div>
                  <input
                    id="doctor-id-connect-input"
                    type="text"
                    value={doctorIdInput}
                    onChange={(e) => setDoctorIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. NS-DOC-7K4P92"
                    className="w-full px-5 py-4 bg-white border-2 border-slate-300 rounded-2xl text-center font-mono text-2xl font-black tracking-wider text-slate-900 focus:outline-none focus:border-[#074738]"
                  />
                  <span className="text-xs font-bold text-slate-600 mt-1.5 block">
                    Ask your physician for their unique Doctor ID (e.g. <strong className="text-[#074738]">NS-DOC-XXXXXX</strong>)
                  </span>
                </div>

                {connectError && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-xl text-sm font-bold">
                    {connectError}
                  </div>
                )}

                {connectSuccess && (
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-xl text-sm font-bold">
                    {connectSuccess}
                  </div>
                )}

                <button
                  id="submit-connect-doctor-btn"
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#074738] hover:bg-[#043328] text-white font-black text-xl shadow-md transition-all cursor-pointer active:scale-98"
                >
                  Connect Doctor Now
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
