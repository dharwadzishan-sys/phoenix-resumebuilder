"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Target,
  Play,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  ChevronDown,
  Star,
  ExternalLink,
  Code2,
  MessageSquare,
  Clock,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Bot,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/lib/api";

// ── Monaco Editor: loaded dynamically to avoid SSR issues ────────────────────
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="ie-editor-loading">
        <Loader2 className="ie-spin" size={24} />
        <span>Loading editor…</span>
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type InterviewMode = "coding" | "conversational";
type EnginePhase = "onboarding" | "setup" | "generating" | "active" | "evaluating" | "results";

interface SkillOption {
  label: string;
  category: "technical" | "soft-skills";
  mode: InterviewMode;
  lang?: string;
}

interface CodingQuestion {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeLimit: string;
  problem: string;
  examples: { input: string; output: string; explanation: string }[];
  hints: string[];
}

interface ConversationalQuestion {
  title: string;
  context: string;
  task: string;
  roleplay: string;
  criteria: string[];
}

type Question = CodingQuestion | ConversationalQuestion;

interface EvaluationResult {
  score: number;
  grade: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestedResources: { title: string; url: string }[];
}

interface OnboardingMessage {
  from: "ai" | "user";
  text: string;
}

// ─── Skill Catalog ────────────────────────────────────────────────────────────

const SKILLS: SkillOption[] = [
  { label: "React",        category: "technical",   mode: "coding",         lang: "javascript" },
  { label: "Node.js",      category: "technical",   mode: "coding",         lang: "javascript" },
  { label: "Python",       category: "technical",   mode: "coding",         lang: "python"     },
  { label: "TypeScript",   category: "technical",   mode: "coding",         lang: "typescript" },
  { label: "SQL",          category: "technical",   mode: "coding",         lang: "sql"        },
  { label: "Java",         category: "technical",   mode: "coding",         lang: "java"       },
  { label: "System Design",    category: "soft-skills", mode: "conversational" },
  { label: "Communication",    category: "soft-skills", mode: "conversational" },
  { label: "Leadership",       category: "soft-skills", mode: "conversational" },
  { label: "Problem Solving",  category: "soft-skills", mode: "conversational" },
  { label: "Conflict Resolution", category: "soft-skills", mode: "conversational" },
];

const CATEGORIES = [
  { value: "technical",   label: "🧑‍💻 Technical (Coding)" },
  { value: "soft-skills", label: "🗣️ Soft Skills (Behavioral)" },
];

// ─── Onboarding conversation steps ───────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    key: "name",
    aiPrompt: "👋 Hello! I'm Alex, your AI interviewer today. Welcome to the Dynamic Interview Engine!\n\nBefore we begin, I'd love to get to know you a little better. Could you please tell me your **full name**?",
  },
  {
    key: "role",
    aiPrompt: (name: string) =>
      `Great to meet you, ${name}! 🎉\n\nWhat **role or position** are you preparing to interview for? (e.g., Frontend Developer, Data Scientist, Product Manager)`,
  },
  {
    key: "experience",
    aiPrompt: (name: string, role: string) =>
      `Excellent! A ${role} position — that's a great goal.\n\nHow many **years of experience** do you have in this field? And are you a fresher or experienced professional?`,
  },
  {
    key: "skills",
    aiPrompt: () =>
      `That's helpful context! Now, what are your **top 3 technical or professional skills** that you're most confident in? (e.g., React, Python, Leadership, Communication)`,
  },
  {
    key: "ready",
    aiPrompt: (name: string, role: string, experience: string, skills: string) =>
      `Perfect, ${name}! Here's a quick summary of what you shared:\n\n• **Role**: ${role}\n• **Experience**: ${experience}\n• **Key Skills**: ${skills}\n\nI'll tailor your interview based on this profile. Are you ready to begin? Click **"Start Interview"** from the panel to choose your challenge type and skill! 🚀`,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").replace(/\n/g, " "));
  utt.rate = 0.9;
  utt.pitch = 1.05;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis.cancel();
}

function gradeColor(grade: string) {
  const map: Record<string, string> = {
    A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444",
  };
  return map[grade] || "#f59e0b";
}

// Render markdown-lite bold (**text**)
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InterviewEngine() {
  const { getToken, user } = useAuth();

  // ── Core state ────────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState<EnginePhase>("onboarding");
  const [category, setCategory]         = useState<"technical" | "soft-skills">("technical");
  const [selectedSkill, setSelectedSkill] = useState<SkillOption>(SKILLS[0]);
  const [question, setQuestion]         = useState<Question | null>(null);
  const [code, setCode]                 = useState<string>("// Write your solution here\n");
  const [transcript, setTranscript]     = useState<string>("");
  const [evaluation, setEvaluation]     = useState<EvaluationResult | null>(null);
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [error, setError]               = useState<string>("");

  // ── Onboarding state ──────────────────────────────────────────────────────
  const [onboardingStep, setOnboardingStep]         = useState(0);
  const [onboardingMessages, setOnboardingMessages] = useState<OnboardingMessage[]>([]);
  const [onboardingInput, setOnboardingInput]       = useState("");
  const [onboardingTyping, setOnboardingTyping]     = useState(false);
  const [userProfile, setUserProfile]               = useState({ name: "", role: "", experience: "", skills: "" });
  const onboardingEndRef                            = useRef<HTMLDivElement>(null);
  const onboardingInputRef                          = useRef<HTMLInputElement>(null);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [elapsed, setElapsed]           = useState(0);
  const timerRef                        = useRef<NodeJS.Timeout | null>(null);

  // ── Voice (SpeechRecognition) ─────────────────────────────────────────────
  const [micActive, setMicActive]       = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef                  = useRef<SpeechRecognition | null>(null);
  const finalTextRef                    = useRef<string>("");   // accumulates final results

  // ── Camera ────────────────────────────────────────────────────────────────
  const [cameraOn, setCameraOn]         = useState(false);
  const [cameraError, setCameraError]   = useState(false);
  const videoRef                        = useRef<HTMLVideoElement>(null);
  const streamRef                       = useRef<MediaStream | null>(null);

  // ── TTS mute ─────────────────────────────────────────────────────────────
  const [ttsEnabled, setTtsEnabled]     = useState(true);

  // ── Hint visibility ───────────────────────────────────────────────────────
  const [showHints, setShowHints]       = useState(false);

  // ── Waveform bars ─────────────────────────────────────────────────────────
  const [waveBars] = useState(() => Array.from({ length: 20 }, (_, i) => i));

  // ── Filter skills by category ─────────────────────────────────────────────
  const filteredSkills = SKILLS.filter((s) => s.category === category);

  // ── Whenever category changes, reset skill to first in that category ──────
  useEffect(() => {
    const first = SKILLS.find((s) => s.category === category);
    if (first) setSelectedSkill(first);
  }, [category]);

  // ── Onboarding: initial AI greeting ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "onboarding") return;
    const firstPrompt = ONBOARDING_STEPS[0].aiPrompt as string;
    setTimeout(() => {
      setOnboardingMessages([{ from: "ai", text: firstPrompt }]);
      if (ttsEnabled) speak(firstPrompt);
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // ── Scroll to bottom of onboarding chat ───────────────────────────────────
  useEffect(() => {
    onboardingEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [onboardingMessages, onboardingTyping]);

  // ── Focus input after AI responds ────────────────────────────────────────
  useEffect(() => {
    if (!onboardingTyping) {
      setTimeout(() => onboardingInputRef.current?.focus(), 100);
    }
  }, [onboardingTyping]);

  // ── Submit onboarding answer ──────────────────────────────────────────────
  const handleOnboardingSubmit = useCallback(() => {
    const answer = onboardingInput.trim();
    if (!answer) return;

    const newProfile = { ...userProfile };
    const stepKey = ONBOARDING_STEPS[onboardingStep].key;
    if (stepKey === "name")       newProfile.name       = answer;
    if (stepKey === "role")       newProfile.role       = answer;
    if (stepKey === "experience") newProfile.experience = answer;
    if (stepKey === "skills")     newProfile.skills     = answer;
    setUserProfile(newProfile);

    // Add user message
    setOnboardingMessages((prev) => [...prev, { from: "user", text: answer }]);
    setOnboardingInput("");

    const nextStep = onboardingStep + 1;

    if (nextStep >= ONBOARDING_STEPS.length) {
      // Done — move to setup
      setTimeout(() => setPhase("setup"), 800);
      return;
    }

    // Show typing indicator, then AI response
    setOnboardingTyping(true);
    setTimeout(() => {
      setOnboardingTyping(false);
      const stepDef = ONBOARDING_STEPS[nextStep];
      let aiText: string;
      if (typeof stepDef.aiPrompt === "function") {
        aiText = (stepDef.aiPrompt as (...args: string[]) => string)(
          newProfile.name,
          newProfile.role,
          newProfile.experience,
          newProfile.skills
        );
      } else {
        aiText = stepDef.aiPrompt as string;
      }
      setOnboardingMessages((prev) => [...prev, { from: "ai", text: aiText }]);
      if (ttsEnabled) speak(aiText);
      setOnboardingStep(nextStep);
    }, 1200);
  }, [onboardingInput, onboardingStep, userProfile, ttsEnabled]);

  // ── Timer management ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phase === "setup") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Voice recognition — create fresh instance per session ─────────────────
  const buildRecognition = useCallback(() => {
    if (typeof window === "undefined") return false;
    const SR =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return false; }

    // Stop any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    finalTextRef.current = "";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTextRef.current += t + " ";
        } else {
          interim = t;
        }
      }
      setTranscript(finalTextRef.current + interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn("SpeechRecognition error:", e.error);
      setMicActive(false);
    };

    rec.onend = () => {
      setMicActive(false);
    };

    recognitionRef.current = rec;
    return true;
  }, []);

  useEffect(() => {
    buildRecognition();
  }, [buildRecognition]);

  // ── Start / stop mic ──────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
    } else {
      // Rebuild recognition to ensure fresh state
      const ok = buildRecognition();
      if (!ok) return;
      setTranscript("");
      finalTextRef.current = "";
      try {
        recognitionRef.current!.start();
        setMicActive(true);
      } catch (e) {
        console.warn("Could not start mic:", e);
      }
    }
  }, [micActive, buildRecognition]);

  // ── Camera — fix: assign stream to videoRef AFTER cameraOn state renders ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraOn(true);   // triggers re-render → <video> mounts
      setCameraError(false);
    } catch {
      setCameraError(true);
    }
  }, []);

  // After cameraOn becomes true, the <video> is now in DOM — assign stream
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Cleanup on unmount — stop camera, mic AND any active TTS speech
  useEffect(() => () => {
    // 1. Kill TTS immediately
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    // 2. Stop camera stream tracks
    stopCamera();
    // 3. Abort speech recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
  }, [stopCamera]);

  // ── Generate question (accepts optional skill override for quick-start) ─────
  const handleStart = useCallback(async (skillOverride?: SkillOption) => {
    const skill = skillOverride || selectedSkill;
    setError("");
    setTranscript("");
    finalTextRef.current = "";
    setCode("// Write your solution here\n");
    setEvaluation(null);
    setSessionId(null);
    if (skillOverride) setSelectedSkill(skillOverride);
    setPhase("generating");

    try {
      const token = await getToken();
      const data = await apiCall("/api/mock/generate", {
        method: "POST",
        body: {
          skill: skill.label,
          mode: skill.mode,
          category: skill.category,
          candidateName: userProfile.name,
          candidateRole: userProfile.role,
        },
        token,
      });

      setQuestion(data.question);
      setPhase("active");

      if (ttsEnabled) {
        const q = data.question as Question;
        const name = userProfile.name ? `${userProfile.name}, ` : "";
        const textToRead = skill.mode === "coding"
          ? `${name}here is your ${skill.label} coding challenge: ${(q as CodingQuestion).problem?.slice(0, 250)}`
          : `${name}here is your behavioral scenario: ${(q as ConversationalQuestion).roleplay}`;
        speak(textToRead);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate question";
      setError(msg);
      setPhase("setup");
    }
  }, [getToken, selectedSkill, ttsEnabled, userProfile]);

  // ── Submit and evaluate ───────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!question) return;
    if (micActive) { recognitionRef.current?.stop(); setMicActive(false); }
    stopSpeaking();
    setPhase("evaluating");
    setError("");

    try {
      const token = await getToken();
      const data = await apiCall("/api/mock/evaluate", {
        method: "POST",
        body: {
          skill: selectedSkill.label,
          mode: selectedSkill.mode,
          category: selectedSkill.category,
          question,
          code: selectedSkill.mode === "coding" ? code : undefined,
          transcript: transcript || undefined,
          sessionId,
          candidateName: userProfile.name,
        },
        token,
      });

      setEvaluation(data.evaluation);
      if (data.sessionId) setSessionId(data.sessionId);
      setPhase("results");

      if (ttsEnabled && data.evaluation?.feedback) {
        const name = userProfile.name ? `${userProfile.name}, ` : "";
        speak(`${name}your score is ${data.evaluation.score} out of 10. ${data.evaluation.feedback}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evaluation failed";
      setError(msg);
      setPhase("active");
    }
  }, [question, micActive, getToken, selectedSkill, code, transcript, sessionId, ttsEnabled, userProfile]);

  // ── Reset to setup ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopSpeaking();
    if (micActive) { recognitionRef.current?.stop(); setMicActive(false); }
    setPhase("setup");
    setQuestion(null);
    setTranscript("");
    finalTextRef.current = "";
    setCode("// Write your solution here\n");
    setEvaluation(null);
    setSessionId(null);
    setError("");
    setShowHints(false);
    setElapsed(0);
  }, [micActive]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ie-root">
      {/* ── Aurora Background ───────────────────────────────────────────── */}
      <div className="ie-aurora" aria-hidden="true">
        <div className="ie-aurora-blob ie-aurora-blob-1" />
        <div className="ie-aurora-blob ie-aurora-blob-2" />
        <div className="ie-aurora-blob ie-aurora-blob-3" />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="ie-header">
        <div className="ie-header-left">
          <Link
            href="/"
            className="ie-back-btn"
            onClick={() => {
              // Stop ALL audio/media before leaving the page
              if (typeof window !== "undefined") window.speechSynthesis.cancel();
              if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch {}
              }
              streamRef.current?.getTracks().forEach((t) => t.stop());
            }}
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="ie-logo">
            <Target size={20} />
            <span>Interview <strong>Engine</strong></span>
          </div>
          {userProfile.name && (
            <span className="ie-user-greeting">👋 {userProfile.name}</span>
          )}
        </div>

        <div className="ie-header-right">
          {phase === "active" && (
            <div className="ie-timer">
              <Clock size={14} />
              {formatTime(elapsed)}
            </div>
          )}
          <button
            onClick={() => { if (ttsEnabled) stopSpeaking(); setTtsEnabled((v) => !v); }}
            className="ie-icon-btn"
            title={ttsEnabled ? "Mute voice" : "Unmute voice"}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {(phase !== "setup" && phase !== "onboarding") && (
            <button onClick={handleReset} className="ie-icon-btn ie-reset-btn" title="New session">
              <RotateCcw size={16} /> New
            </button>
          )}
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          ONBOARDING PHASE — AI Greeter Chat
          ════════════════════════════════════════════════════════════════════ */}
      {phase === "onboarding" && (
        <div className="ie-onboarding">
          <div className="ie-ob-chat">
            <div className="ie-ob-messages">
              <AnimatePresence initial={false}>
                {onboardingMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`ie-ob-msg ie-ob-msg-${msg.from}`}
                  >
                    <div className="ie-ob-avatar">
                      {msg.from === "ai" ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className="ie-ob-bubble">
                      {msg.text.split("\n").map((line, j) => (
                        <p key={j}>{renderText(line)}</p>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {onboardingTyping && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ie-ob-msg ie-ob-msg-ai"
                  >
                    <div className="ie-ob-avatar"><Bot size={16} /></div>
                    <div className="ie-ob-bubble ie-ob-typing">
                      <span /><span /><span />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={onboardingEndRef} />
            </div>

            {/* Input row — only show when not the final "ready" step */}
            {onboardingStep < ONBOARDING_STEPS.length - 1 && !onboardingTyping && (
              <div className="ie-ob-input-row">
                <input
                  ref={onboardingInputRef}
                  className="ie-ob-input"
                  placeholder={
                    onboardingStep === 0 ? "Type your name…"
                    : onboardingStep === 1 ? "Type your target role…"
                    : onboardingStep === 2 ? "e.g. 2 years, fresher…"
                    : "e.g. React, Python, Leadership…"
                  }
                  value={onboardingInput}
                  onChange={(e) => setOnboardingInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleOnboardingSubmit(); }}
                />
                <button
                  className="ie-ob-send"
                  onClick={handleOnboardingSubmit}
                  disabled={!onboardingInput.trim()}
                >
                  <Send size={16} />
                </button>
              </div>
            )}

            {/* On last step — show "Start Interview" button */}
            {onboardingStep === ONBOARDING_STEPS.length - 1 && !onboardingTyping && (
              <div className="ie-ob-actions">
                <button
                  className="ie-start-btn ie-ob-start"
                  onClick={() => setPhase("setup")}
                >
                  <Play size={18} /> Start Interview <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Side panel: user profile summary (fills in as user answers) */}
          <div className="ie-ob-profile">
            <div className="ie-ob-profile-icon"><Bot size={32} /></div>
            <h3>Alex</h3>
            <p className="ie-ob-profile-role">Your AI Interviewer</p>
            <div className="ie-ob-profile-divider" />
            <h4>Your Profile</h4>
            {[
              { label: "Name", val: userProfile.name },
              { label: "Target Role", val: userProfile.role },
              { label: "Experience", val: userProfile.experience },
              { label: "Key Skills", val: userProfile.skills },
            ].map(({ label, val }) => (
              <div key={label} className="ie-ob-profile-row">
                <span className="ie-ob-profile-label">{label}</span>
                <span className="ie-ob-profile-val">{val || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MAIN INTERVIEW LAYOUT (setup → active → results)
          ════════════════════════════════════════════════════════════════════ */}
      {phase !== "onboarding" && (
        <div className="ie-body">

          {/* ── Left Panel ──────────────────────────────────────────────── */}
          <aside className="ie-left-panel">

            {/* Controls */}
            <div className="ie-controls-card">
              <h3 className="ie-panel-title">Configure</h3>

              <label className="ie-label">Category</label>
              <div className="ie-select-wrap">
                <select
                  className="ie-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as "technical" | "soft-skills")}
                  disabled={phase !== "setup"}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="ie-select-arrow" />
              </div>

              <label className="ie-label">Skill</label>
              <div className="ie-select-wrap">
                <select
                  className="ie-select"
                  value={selectedSkill.label}
                  onChange={(e) => {
                    const s = filteredSkills.find((x) => x.label === e.target.value);
                    if (s) setSelectedSkill(s);
                  }}
                  disabled={phase !== "setup"}
                >
                  {filteredSkills.map((s) => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="ie-select-arrow" />
              </div>

              <div className={`ie-mode-badge ${selectedSkill.mode}`}>
                {selectedSkill.mode === "coding"
                  ? <><Code2 size={12} /> Coding Challenge</>
                  : <><MessageSquare size={12} /> Behavioral Scenario</>
                }
              </div>

              {(phase === "setup" || phase === "generating") && (
                <button
                  onClick={() => handleStart()}
                  disabled={phase === "generating"}
                  className="ie-start-btn"
                >
                  {phase === "generating" ? (
                    <><Loader2 className="ie-spin" size={16} /> Generating…</>
                  ) : (
                    <><Play size={16} /> Start Interview</>
                  )}
                </button>
              )}

              {error && <p className="ie-error">{error}</p>}
            </div>

            {/* Voice controls */}
            {(phase === "active" || phase === "evaluating") && (
              <div className="ie-voice-card">
                <h3 className="ie-panel-title">Your Voice</h3>

                {voiceSupported ? (
                  <>
                    <button
                      onClick={toggleMic}
                      disabled={phase === "evaluating"}
                      className={`ie-mic-btn ${micActive ? "active" : ""}`}
                    >
                      {micActive ? <MicOff size={18} /> : <Mic size={18} />}
                      {micActive ? "Stop Mic" : "Start Mic"}
                    </button>

                    <div className={`ie-waveform ${micActive ? "ie-waveform-active" : ""}`}>
                      {waveBars.map((i) => (
                        <div
                          key={i}
                          className="ie-wave-bar"
                          style={{ animationDelay: `${(i * 50) % 400}ms` }}
                        />
                      ))}
                    </div>

                    {transcript && (
                      <div className="ie-transcript-mini">
                        <p>{transcript.slice(-200)}{transcript.length > 200 ? "…" : ""}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="ie-voice-unsupported">
                    Voice not supported in this browser. Type your answer below.
                  </p>
                )}
              </div>
            )}

            {/* Camera PIP */}
            <div className="ie-camera-card">
              <div className="ie-camera-header">
                <h3 className="ie-panel-title">Camera</h3>
                <button
                  onClick={cameraOn ? stopCamera : startCamera}
                  className="ie-icon-btn"
                  title={cameraOn ? "Turn off camera" : "Turn on camera"}
                >
                  {cameraOn ? <CameraOff size={14} /> : <Camera size={14} />}
                </button>
              </div>
              <div className="ie-camera-feed">
                {/* IMPORTANT: video is always in DOM when cameraOn, stream assigned via useEffect */}
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="ie-video"
                  />
                ) : (
                  <div className="ie-camera-placeholder">
                    <Camera size={28} />
                    <span>{cameraError ? "Camera denied" : "Camera off"}</span>
                  </div>
                )}
              </div>
              <p className="ie-camera-note">
                {user ? `✓ ${user.displayName || user.email}` : "Sign in to save sessions"}
              </p>
            </div>
          </aside>

          {/* ── Right Panel ─────────────────────────────────────────────── */}
          <main className="ie-right-panel">
            <AnimatePresence mode="wait">

              {/* SETUP */}
              {phase === "setup" && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="ie-setup-hero"
                >
                  <div className="ie-setup-icon"><Target size={48} /></div>
                  <h1>
                    {userProfile.name
                      ? `Ready, ${userProfile.name.split(" ")[0]}!`
                      : "Dynamic Interview Engine"}
                  </h1>
                  <p>
                    {userProfile.role
                      ? `Pick a skill and start your ${userProfile.role} interview!`
                      : "Select a category and skill, then click Start Interview."}
                  </p>
                  {/* Quick-start action tabs */}
                  <div className="ie-feature-grid">
                    <button
                      className="ie-feature-card ie-feature-card-btn"
                      onClick={() => handleStart(SKILLS.find((x) => x.label === "React")!)}
                    >
                      <Code2 size={20} />
                      <span>Live Code Editor</span>
                      <small>Start a React coding challenge →</small>
                    </button>
                    <button
                      className="ie-feature-card ie-feature-card-btn"
                      onClick={() => handleStart(SKILLS.find((x) => x.label === "Communication")!)}
                    >
                      <Mic size={20} />
                      <span>Voice Interview</span>
                      <small>Start a behavioral scenario →</small>
                    </button>
                    <button
                      className="ie-feature-card ie-feature-card-btn"
                      onClick={() => handleStart()}
                    >
                      <Star size={20} />
                      <span>Start Selected Skill</span>
                      <small>Begin with current selection →</small>
                    </button>
                    <button
                      className="ie-feature-card ie-feature-card-btn"
                      onClick={() => { if (!cameraOn) startCamera(); else stopCamera(); }}
                    >
                      {cameraOn ? <CameraOff size={20} /> : <Camera size={20} />}
                      <span>{cameraOn ? "Camera On" : "Enable Camera"}</span>
                      <small>{cameraOn ? "Click to turn off" : "Turn on self-view PIP"}</small>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* GENERATING */}
              {phase === "generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ie-loading-screen"
                >
                  <div className="ie-loading-ring" />
                  <h2>Preparing your {selectedSkill.label} interview…</h2>
                  <p>The AI is crafting a tailored {selectedSkill.mode === "coding" ? "coding challenge" : "behavioral scenario"} for you.</p>
                </motion.div>
              )}

              {/* ACTIVE — CODING */}
              {phase === "active" && selectedSkill.mode === "coding" && question && (
                <motion.div
                  key="coding"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="ie-coding-layout"
                >
                  <div className="ie-problem-card">
                    <div className="ie-problem-header">
                      <h2>{(question as CodingQuestion).title}</h2>
                      <div className="ie-problem-meta">
                        <span className={`ie-difficulty ie-difficulty-${(question as CodingQuestion).difficulty?.toLowerCase()}`}>
                          {(question as CodingQuestion).difficulty}
                        </span>
                        <span className="ie-time-limit">
                          <Clock size={12} /> {(question as CodingQuestion).timeLimit}
                        </span>
                      </div>
                    </div>
                    <p className="ie-problem-text">{(question as CodingQuestion).problem}</p>

                    {(question as CodingQuestion).examples?.length > 0 && (
                      <div className="ie-examples">
                        {(question as CodingQuestion).examples.map((ex, i) => (
                          <div key={i} className="ie-example">
                            <div><strong>Input:</strong> <code>{ex.input}</code></div>
                            <div><strong>Output:</strong> <code>{ex.output}</code></div>
                            {ex.explanation && <div><small>{ex.explanation}</small></div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {(question as CodingQuestion).hints?.length > 0 && (
                      <button className="ie-hints-toggle" onClick={() => setShowHints((v) => !v)}>
                        <Lightbulb size={14} /> {showHints ? "Hide Hints" : "Show Hints"}
                      </button>
                    )}
                    {showHints && (
                      <ul className="ie-hints-list">
                        {(question as CodingQuestion).hints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="ie-editor-wrap">
                    <MonacoEditor
                      height="100%"
                      language={selectedSkill.lang || "javascript"}
                      value={code}
                      onChange={(v) => setCode(v || "")}
                      theme="vs-dark"
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        padding: { top: 12, bottom: 12 },
                      }}
                    />
                  </div>

                  {transcript && (
                    <div className="ie-transcript-area">
                      <h4><Mic size={12} /> Voice Transcript</h4>
                      <p>{transcript}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ACTIVE — CONVERSATIONAL */}
              {phase === "active" && selectedSkill.mode === "conversational" && question && (
                <motion.div
                  key="conversational"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="ie-conv-layout"
                >
                  <div className="ie-scenario-board">
                    <div className="ie-scenario-label">
                      <MessageSquare size={14} /> Behavioral Scenario
                    </div>
                    <h2>{(question as ConversationalQuestion).title}</h2>

                    {(question as ConversationalQuestion).context && (
                      <div className="ie-scenario-context">
                        <strong>Context:</strong> {(question as ConversationalQuestion).context}
                      </div>
                    )}

                    <div className="ie-scenario-roleplay">
                      &ldquo;{(question as ConversationalQuestion).roleplay}&rdquo;
                    </div>

                    {(question as ConversationalQuestion).criteria?.length > 0 && (
                      <div className="ie-scenario-criteria">
                        <h4>You&apos;ll be evaluated on:</h4>
                        <ul>
                          {(question as ConversationalQuestion).criteria.map((c, i) => (
                            <li key={i}><CheckCircle2 size={12} /> {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="ie-voice-center">
                    <div className={`ie-voice-orb ${micActive ? "ie-voice-orb-active" : ""}`}>
                      {micActive ? <MicOff size={32} /> : <Mic size={32} />}
                      <div className="ie-voice-rings">
                        <div className="ie-ring ie-ring-1" />
                        <div className="ie-ring ie-ring-2" />
                        <div className="ie-ring ie-ring-3" />
                      </div>
                    </div>
                    <p className="ie-voice-hint">
                      {micActive ? "🔴 Listening… speak your answer" : "Click 'Start Mic' in the left panel to answer"}
                    </p>
                  </div>

                  <div className="ie-transcript-area-conv">
                    <h4><Mic size={12} /> Your Transcript</h4>
                    <p className="ie-transcript-text">
                      {transcript || "Your spoken words will appear here…"}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* EVALUATING */}
              {phase === "evaluating" && (
                <motion.div
                  key="evaluating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ie-loading-screen"
                >
                  <div className="ie-loading-ring ie-loading-ring-eval" />
                  <h2>Evaluating your submission…</h2>
                  <p>The AI is reviewing your {selectedSkill.mode === "coding" ? "code and explanation" : "response"} and preparing detailed feedback.</p>
                </motion.div>
              )}

              {/* RESULTS */}
              {phase === "results" && evaluation && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="ie-results"
                >
                  <div className="ie-results-header">
                    <div
                      className="ie-score-ring"
                      style={{ "--score-color": gradeColor(evaluation.grade) } as React.CSSProperties}
                    >
                      <span className="ie-score-num">{evaluation.score}</span>
                      <span className="ie-score-denom">/10</span>
                    </div>
                    <div>
                      <div
                        className="ie-grade-badge"
                        style={{ background: gradeColor(evaluation.grade) }}
                      >
                        Grade {evaluation.grade}
                      </div>
                      <h2>{selectedSkill.label} Interview Complete</h2>
                      <p className="ie-feedback-text">{evaluation.feedback}</p>
                    </div>
                  </div>

                  <div className="ie-results-grid">
                    <div className="ie-result-section ie-strengths">
                      <h3><CheckCircle2 size={16} /> Strengths</h3>
                      <ul>
                        {(evaluation.strengths || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="ie-result-section ie-improvements">
                      <h3><XCircle size={16} /> Areas to Improve</h3>
                      <ul>
                        {(evaluation.improvements || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {(evaluation.suggestedResources || []).length > 0 && (
                    <div className="ie-resources">
                      <h3><ExternalLink size={16} /> Suggested Resources</h3>
                      <div className="ie-resource-links">
                        {evaluation.suggestedResources.map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ie-resource-link"
                          >
                            <ExternalLink size={12} />
                            {r.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="ie-results-actions">
                    <button onClick={() => handleStart()} className="ie-start-btn">
                      <Play size={16} /> Try Again
                    </button>
                    <button onClick={handleReset} className="ie-icon-btn ie-reset-btn-lg">
                      <RotateCcw size={16} /> New Skill
                    </button>
                    {sessionId && (
                      <span className="ie-saved-badge">
                        <CheckCircle2 size={12} /> Saved to your profile
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Submit bar */}
            {phase === "active" && (
              <div className="ie-submit-bar">
                {!voiceSupported && (
                  <input
                    className="ie-fallback-input"
                    placeholder="Type your answer here (voice not supported in this browser)…"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                  />
                )}
                <button
                  onClick={handleSubmit}
                  className="ie-submit-btn"
                  disabled={selectedSkill.mode === "conversational" && !transcript.trim()}
                >
                  <Send size={16} />
                  {selectedSkill.mode === "coding" ? "Submit Code & Explanation" : "Submit Answer"}
                </button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
