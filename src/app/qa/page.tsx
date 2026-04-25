"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, BrainCircuit, ChevronDown, ChevronUp, HelpCircle, Send, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/lib/api";

export default function QAGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<{q: string, a: string}[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { getToken } = useAuth();

  // ── Clarification state — per question index ──────────────────────────────
  const [clarifyOpen, setClarifyOpen]   = useState<number | null>(null);
  const [clarifyText, setClarifyText]   = useState<Record<number, string>>({});
  const [clarifyReply, setClarifyReply] = useState<Record<number, string>>({});
  const [clarifyLoading, setClarifyLoading] = useState<Record<number, boolean>>({});

  const handleClarify = async (idx: number, question: string, answer: string) => {
    const userQuery = clarifyText[idx]?.trim();
    if (!userQuery) return;
    setClarifyLoading(prev => ({ ...prev, [idx]: true }));
    setClarifyReply(prev => ({ ...prev, [idx]: "" }));
    try {
      const token = await getToken();
      const data = await apiCall("/api/qa", {
        method: "POST",
        body: {
          targetRole: "clarification",
          domain: "clarification",
          focusAreas: `Clarify this for me in simple terms. Question: "${question}". Ideal Answer: "${answer}". My confusion: "${userQuery}". Give a concise, friendly explanation in 3-5 sentences.`,
        },
        token,
      });
      // Backend returns questions array — use first answer as the clarification
      const reply = data.questions?.[0]?.a
        || data.clarification
        || data.message
        || "Sorry, couldn't get a clarification right now. Please try again.";
      setClarifyReply(prev => ({ ...prev, [idx]: reply }));
    } catch {
      setClarifyReply(prev => ({ ...prev, [idx]: "Network error. Make sure the backend is running and try again." }));
    } finally {
      setClarifyLoading(prev => ({ ...prev, [idx]: false }));
    }
  };

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setExpanded(null);

    const formData = new FormData(e.currentTarget);

    try {
      const token = await getToken();
      const data = await apiCall("/api/qa", {
        method: "POST",
        body: {
          targetRole: formData.get('role') as string,
          domain: formData.get('domain') as string,
          focusAreas: formData.get('focus') as string,
          experienceLevel: formData.get('level') as string,
        },
        token,
      });

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions([{ q: "Error generating questions", a: data.error || "Please try again." }]);
      }
    } catch(err) {
      const message = err instanceof Error ? err.message : "Server connectivity issue";
      setQuestions([{ q: "Backend execution failed", a: message }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <header>
        <div className="layout-container" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/" className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>
            <ArrowLeft size={20} /> Back
          </Link>
          <div className="logo" style={{ fontSize: "1.25rem" }}>
            <MessageSquare size={24} />
            Interview <span>Q&A</span>
          </div>
        </div>
      </header>

      <main className="layout-container animate-fade-in" style={{ marginTop: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem", alignItems: "start" }}>
          
          <div className="glass-panel">
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Configuration</h2>
            <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <label className="label">Target Role</label>
                <input name="role" required type="text" className="input-field" placeholder="e.g. Backend Engineer, Marketing Manager" />
              </div>
              
              <div>
                <label className="label">Domain / Industry</label>
                <input name="domain" required type="text" className="input-field" placeholder="e.g. FinTech, Healthcare, E-Commerce" />
              </div>

              <div>
                <label className="label">Experience Level</label>
                <select name="level" className="input-field" required>
                  <option value="entry">Entry Level (0–2 yrs) — Fundamentals &amp; Basics</option>
                  <option value="mid" defaultChecked>Mid Level (2–5 yrs) — Problem Solving &amp; Patterns</option>
                  <option value="senior">Senior Level (5+ yrs) — Architecture &amp; Leadership</option>
                </select>
              </div>

              <div>
                <label className="label">Focus Areas (Optional)</label>
                <input name="focus" type="text" className="input-field" placeholder="e.g. System Design, Leadership" />
              </div>

              <button type="submit" className="btn-primary" disabled={isGenerating} style={{ marginTop: "0.5rem" }}>
                {isGenerating ? (
                  <>Curating Questions... <BrainCircuit size={20} className="animate-spin" /></>
                ) : (
                  <>Generate Q&amp;A <BrainCircuit size={20} /></>
                )}
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Practice Q&A</h2>
            
            <div style={{ flex: 1 }}>
              {isGenerating ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--muted-foreground)", gap: "1rem" }}>
                  <BrainCircuit size={40} style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                  <p>AI is generating role-specific questions...</p>
                </div>
              ) : questions ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {questions.map((item, idx) => (
                    <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                      <button 
                        onClick={() => setExpanded(expanded === idx ? null : idx)}
                        style={{ width: "100%", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--card)" }}
                      >
                        <h4 style={{ fontSize: "1.1rem", textAlign: "left", flex: 1, paddingRight: "1rem" }}>Q: {item.q}</h4>
                        {expanded === idx ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
                      </button>
                      
                      {expanded === idx && (
                        <div style={{ backgroundColor: "var(--input)", borderTop: "1px solid var(--border)" }}>
                          {/* ── Ideal Answer ───────────────────────────────── */}
                          <div style={{ padding: "1.5rem" }}>
                            <h5 style={{ color: "var(--primary)", marginBottom: "0.5rem", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ideal Answer:</h5>
                            <p style={{ lineHeight: 1.6, margin: 0 }}>{item.a}</p>
                          </div>

                          {/* ── Clarification Panel ─────────────────────────── */}
                          <div style={{
                            borderTop: "1px solid var(--border)",
                            background: "var(--card)",
                          }}>
                            {/* Toggle button */}
                            <button
                              onClick={() => setClarifyOpen(clarifyOpen === idx ? null : idx)}
                              style={{
                                width: "100%", padding: "0.75rem 1.5rem",
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                background: "transparent", border: "none",
                                color: clarifyOpen === idx ? "var(--primary)" : "var(--muted-foreground)",
                                cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                                transition: "color 0.15s",
                              }}
                            >
                              <HelpCircle size={15} />
                              Still confused? Ask for a simpler explanation
                              <span style={{ marginLeft: "auto" }}>
                                {clarifyOpen === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            </button>

                            {/* Clarification input + reply */}
                            {clarifyOpen === idx && (
                              <div style={{ padding: "0 1.5rem 1.25rem" }}>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                                  <textarea
                                    rows={2}
                                    placeholder="e.g. What does 'event loop' mean here? Can you use an analogy?"
                                    value={clarifyText[idx] || ""}
                                    onChange={e => setClarifyText(prev => ({ ...prev, [idx]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleClarify(idx, item.q, item.a);
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      background: "var(--input)",
                                      border: "1px solid var(--border)",
                                      borderRadius: "var(--radius)",
                                      padding: "0.6rem 0.85rem",
                                      fontSize: "0.82rem",
                                      color: "var(--foreground)",
                                      resize: "none",
                                      outline: "none",
                                      transition: "border-color 0.15s",
                                      lineHeight: 1.5,
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                                    onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                                  />
                                  <button
                                    onClick={() => handleClarify(idx, item.q, item.a)}
                                    disabled={clarifyLoading[idx] || !clarifyText[idx]?.trim()}
                                    title="Get clarification (or press Enter)"
                                    style={{
                                      background: "var(--primary)",
                                      color: "#000",
                                      border: "none",
                                      borderRadius: "var(--radius)",
                                      padding: "0.6rem 0.85rem",
                                      cursor: clarifyLoading[idx] || !clarifyText[idx]?.trim() ? "not-allowed" : "pointer",
                                      opacity: clarifyLoading[idx] || !clarifyText[idx]?.trim() ? 0.55 : 1,
                                      display: "flex", alignItems: "center", gap: "0.3rem",
                                      fontSize: "0.8rem", fontWeight: 600,
                                      transition: "opacity 0.15s",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {clarifyLoading[idx]
                                      ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Asking...</>
                                      : <><Send size={14} /> Ask</>}
                                  </button>
                                </div>

                                {/* AI Clarification Reply */}
                                {clarifyReply[idx] && (
                                  <div style={{
                                    marginTop: "0.85rem",
                                    padding: "0.9rem 1rem",
                                    background: "rgba(245,158,11,0.07)",
                                    border: "1px solid rgba(245,158,11,0.25)",
                                    borderRadius: "var(--radius)",
                                    position: "relative",
                                  }}>
                                    <div style={{
                                      fontSize: "0.68rem", fontWeight: 700,
                                      color: "var(--primary)", textTransform: "uppercase",
                                      letterSpacing: "0.1em", marginBottom: "0.4rem",
                                      display: "flex", alignItems: "center", gap: "0.35rem",
                                    }}>
                                      <HelpCircle size={12} /> AI Clarification
                                    </div>
                                    <p style={{ fontSize: "0.82rem", lineHeight: 1.65, margin: 0, color: "var(--foreground)" }}>
                                      {clarifyReply[idx]}
                                    </p>
                                    <button
                                      onClick={() => {
                                        setClarifyReply(prev => ({ ...prev, [idx]: "" }));
                                        setClarifyText(prev => ({ ...prev, [idx]: "" }));
                                      }}
                                      title="Clear"
                                      style={{
                                        position: "absolute", top: "0.5rem", right: "0.5rem",
                                        background: "transparent", border: "none",
                                        cursor: "pointer", color: "var(--muted-foreground)",
                                        padding: "0.15rem",
                                      }}
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--muted-foreground)" }}>
                  <p>Configure and generate to see your questions.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
