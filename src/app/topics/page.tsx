"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Layers, CheckCircle2,
  Sparkles, PlusCircle, Loader2, ExternalLink, ChevronUp, ChevronDown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/lib/api";

interface Module { title: string; desc: string; topics: string[]; }

// ─── ExplainSection label helper ─────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.13em",
      textTransform: "uppercase", color: "var(--primary)",
      marginBottom: "0.35rem",
    }}>
      {children}
    </div>
  );
}

export default function StudyTopics() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [modules, setModules] = useState<Module[] | null>(null);
  const { getToken } = useAuth();

  // Explain state per "modIdx-topicIdx" key — stored as raw plain text
  const [explains, setExplains]       = useState<Record<string, string>>({});
  const [explainOpen, setExplainOpen] = useState<Record<string, boolean>>({});
  const [explainLoad, setExplainLoad] = useState<Record<string, boolean>>({});

  // More-like-this loading per module
  const [moreLoad, setMoreLoad] = useState<Record<number, boolean>>({});

  // ─── Generate study plan ─────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    const formData = new FormData(e.currentTarget);
    try {
      const token = await getToken();
      const data = await apiCall("/api/topics", {
        method: "POST",
        body: {
          targetRole: formData.get("role") as string,
          experience: formData.get("level") as string,
        },
        token,
      });
      if (data.modules && data.modules.length > 0) {
        setModules(data.modules);
      } else {
        setModules([{ title: "Error", desc: data.error || "Failed to load plan", topics: [] }]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cannot connect to server.";
      setModules([{ title: "Network Error", desc: message, topics: [] }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Explain — paragraph format via /api/qa ───────────────────────────────
  const handleExplain = async (modIdx: number, topicIdx: number, topic: string, moduleTitle: string) => {
    const key = `${modIdx}-${topicIdx}`;
    if (explainOpen[key]) {
      setExplainOpen(p => ({ ...p, [key]: false }));
      return;
    }
    setExplainOpen(p => ({ ...p, [key]: true }));
    if (explains[key]) return;

    setExplainLoad(p => ({ ...p, [key]: true }));
    try {
      const token = await getToken();
      const data = await apiCall("/api/qa", {
        method: "POST",
        body: {
          targetRole: topic,
          domain: moduleTitle,
          experienceLevel: "mid",
          focusAreas: `Write a detailed explanation of "${topic}" in plain flowing paragraphs (no bullet points, no markdown, no headers).

Write exactly 4 paragraphs separated by a blank line:
Paragraph 1 — Definition: What is ${topic}? (2-3 sentences, plain language)
Paragraph 2 — Why it matters: Why do developers or professionals need to know this? (2-3 sentences)
Paragraph 3 — How it works: Explain the core mechanism or key concepts in detail. (3-4 sentences)
Paragraph 4 — Real-world example: Start with "For example," and give a concrete use case. (2-3 sentences)

After the 4 paragraphs, on a new line write:
REFERENCES: [Resource Name] - [URL], [Resource Name] - [URL]

Use only real, valid URLs from MDN, official docs, or well-known learning resources.`,
        },
        token,
      });

      const raw: string = data.questions?.[0]?.a || data.questions?.[0]?.q || "";
      setExplains(p => ({
        ...p,
        [key]: raw || "Could not generate explanation. Please try again.",
      }));
    } catch {
      setExplains(p => ({
        ...p,
        [key]: "Network error — make sure the backend server is running on port 5000.",
      }));
    } finally {
      setExplainLoad(p => ({ ...p, [key]: false }));
    }
  };

  // Parse plain-text response into paragraphs + reference links
  const parseExplainText = (raw: string) => {
    const refMatch = raw.match(/REFERENCES?:\s*(.+)$/im);
    const bodyText = raw.replace(/REFERENCES?:\s*.+$/im, "").trim();
    const paragraphs = bodyText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    let refs: { title: string; url: string }[] = [];
    if (refMatch) {
      refs = refMatch[1]
        .split(",")
        .map(r => {
          const parts = r.split(" - ");
          return {
            title: parts[0]?.trim() || r.trim(),
            url: parts[1]?.trim() || "",
          };
        })
        .filter(r => r.title.length > 0);
    }
    return { paragraphs, refs };
  };

  // ─── More like this ───────────────────────────────────────────────────────
  const handleMore = async (modIdx: number, mod: Module) => {
    setMoreLoad(p => ({ ...p, [modIdx]: true }));
    try {
      const token = await getToken();
      const existing = mod.topics.join(", ");
      const data = await apiCall("/api/topics", {
        method: "POST",
        body: {
          targetRole: mod.title,
          experience: `I already have: ${existing}. Give me 4 MORE different sub-topics within "${mod.title}".`,
        },
        token,
      });
      const newTopics: string[] = data.modules?.[0]?.topics || [];
      if (newTopics.length) {
        setModules(prev =>
          prev
            ? prev.map((m, i) =>
                i === modIdx
                  ? { ...m, topics: [...m.topics, ...newTopics.filter(t => !m.topics.includes(t))] }
                  : m
              )
            : prev
        );
      }
    } catch { /* silent */ }
    finally { setMoreLoad(p => ({ ...p, [modIdx]: false })); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-16">
      <header>
        <div className="layout-container" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/" className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>
            <ArrowLeft size={20} /> Back
          </Link>
          <div className="logo" style={{ fontSize: "1.25rem" }}>
            <BookOpen size={24} />
            Study <span>Concepts</span>
          </div>
        </div>
      </header>

      <main className="layout-container animate-fade-in" style={{ marginTop: "2rem", maxWidth: "1000px" }}>
        {/* Config form */}
        <div className="glass-panel" style={{ marginBottom: "3rem" }}>
          <form onSubmit={handleGenerate} style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <label className="label">Your Target Role</label>
              <input name="role" required type="text" className="input-field" placeholder="e.g. Frontend Developer" />
            </div>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <label className="label">Experience Level</label>
              <select name="level" className="input-field" required>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={isGenerating}>
              {isGenerating ? "Curating Roadmap..." : "Generate Study Plan"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div>
          {isGenerating ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--muted-foreground)", gap: "1rem" }}>
              <Layers size={40} style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
              <p>Curating your personalized learning roadmap...</p>
            </div>
          ) : modules ? (
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "20px", top: "20px", bottom: "20px", width: "2px", backgroundColor: "var(--border)", zIndex: 0 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
                {modules.map((mod, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "2rem", position: "relative", zIndex: 1 }}>

                    {/* Timeline node */}
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      backgroundColor: "var(--card)", border: `2px solid var(--chart-${(idx % 5) + 1})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "bold", fontSize: "1.2rem", color: `var(--chart-${(idx % 5) + 1})`,
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>

                    {/* Module card */}
                    <div className="glass-panel" style={{ flex: 1, padding: "1.5rem" }}>
                      <h3 style={{ fontSize: "1.25rem", color: `var(--chart-${(idx % 5) + 1})`, marginBottom: "0.5rem" }}>
                        {mod.title}
                      </h3>
                      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>{mod.desc}</p>

                      {/* Topic list */}
                      <ul style={{ display: "flex", flexDirection: "column", gap: 0, listStyle: "none" }}>
                        {mod.topics.map((t, tidx) => {
                          const key = `${idx}-${tidx}`;
                          const isOpen    = explainOpen[key];
                          const isLoading = explainLoad[key];
                          const stored    = explains[key];

                          return (
                            <li key={tidx} style={{ borderBottom: "1px solid var(--border)" }}>

                              {/* Topic row */}
                              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.65rem 0" }}>
                                <CheckCircle2
                                  size={18}
                                  style={{
                                    color: isOpen ? "var(--primary)" : "var(--muted-foreground)",
                                    flexShrink: 0, transition: "color 0.2s",
                                  }}
                                />
                                <span style={{ fontSize: "0.95rem", flex: 1 }}>{t}</span>

                                {/* Explain button */}
                                <button
                                  onClick={() => handleExplain(idx, tidx, t, mod.title)}
                                  style={{
                                    display: "flex", alignItems: "center", gap: "0.3rem",
                                    background: isOpen ? "var(--primary)" : "transparent",
                                    color: isOpen ? "#000" : "var(--muted-foreground)",
                                    border: `1px solid ${isOpen ? "var(--primary)" : "var(--border)"}`,
                                    borderRadius: "6px", padding: "0.2rem 0.6rem",
                                    fontSize: "0.72rem", fontWeight: 600,
                                    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                                  }}
                                  onMouseEnter={e => {
                                    if (!isOpen) {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)";
                                      (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!isOpen) {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                                      (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)";
                                    }
                                  }}
                                >
                                  {isLoading
                                    ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Loading...</>
                                    : isOpen
                                      ? <><ChevronUp size={11} /> Hide</>
                                      : <><Sparkles size={11} /> Explain</>}
                                </button>
                              </div>

                              {/* ── Paragraph Explanation Panel ── */}
                              {isOpen && (
                                <div style={{
                                  margin: "0 0 0.9rem 1.75rem",
                                  border: "1px solid rgba(245,158,11,0.25)",
                                  borderRadius: "10px",
                                  overflow: "hidden",
                                  background: "rgba(245,158,11,0.04)",
                                }}>
                                  {/* Header */}
                                  <div style={{
                                    padding: "0.6rem 1rem",
                                    background: "rgba(245,158,11,0.12)",
                                    borderBottom: "1px solid rgba(245,158,11,0.2)",
                                    display: "flex", alignItems: "center", gap: "0.4rem",
                                    fontSize: "0.62rem", fontWeight: 800,
                                    letterSpacing: "0.13em", textTransform: "uppercase",
                                    color: "var(--primary)",
                                  }}>
                                    <Sparkles size={12} /> {t}
                                  </div>

                                  {isLoading || !stored ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--muted-foreground)", fontSize: "0.82rem", padding: "1.1rem" }}>
                                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                      Generating explanation...
                                    </div>
                                  ) : (() => {
                                    const { paragraphs, refs } = parseExplainText(stored);
                                    return (
                                      <div style={{ padding: "1.1rem 1.2rem" }}>

                                        {/* Paragraphs */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                                          {paragraphs.map((para, pi) => (
                                            <p key={pi} style={{
                                              margin: 0,
                                              fontSize: "0.84rem",
                                              lineHeight: 1.82,
                                              color: "var(--foreground)",
                                              textAlign: "justify",
                                            }}>
                                              {para}
                                            </p>
                                          ))}
                                        </div>

                                        {/* References */}
                                        {refs.length > 0 && (
                                          <div style={{
                                            marginTop: "1rem",
                                            paddingTop: "0.85rem",
                                            borderTop: "1px solid rgba(245,158,11,0.2)",
                                          }}>
                                            <SectionLabel>
                                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                                <ExternalLink size={11} /> References &amp; Further Reading
                                              </span>
                                            </SectionLabel>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                                              {refs.map((ref, ri) => (
                                                <a
                                                  key={ri}
                                                  href={ref.url.startsWith("http") ? ref.url : `https://www.google.com/search?q=${encodeURIComponent(ref.title)}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  style={{
                                                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                                                    fontSize: "0.75rem", fontWeight: 500,
                                                    color: "var(--primary)", textDecoration: "none",
                                                    padding: "0.28rem 0.7rem", borderRadius: "999px",
                                                    background: "rgba(245,158,11,0.08)",
                                                    border: "1px solid rgba(245,158,11,0.22)",
                                                    transition: "background 0.15s",
                                                  }}
                                                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.18)")}
                                                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
                                                >
                                                  <ExternalLink size={11} style={{ flexShrink: 0 }} />
                                                  {ref.title}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* More like this */}
                      <button
                        onClick={() => handleMore(idx, mod)}
                        disabled={moreLoad[idx]}
                        style={{
                          marginTop: "1.1rem",
                          display: "flex", alignItems: "center", gap: "0.45rem",
                          background: "transparent",
                          color: moreLoad[idx] ? "var(--muted-foreground)" : `var(--chart-${(idx % 5) + 1})`,
                          border: "1px dashed var(--border)",
                          borderRadius: "8px", padding: "0.5rem 0.9rem",
                          fontSize: "0.78rem", fontWeight: 600,
                          cursor: moreLoad[idx] ? "not-allowed" : "pointer",
                          width: "100%", justifyContent: "center",
                          opacity: moreLoad[idx] ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { if (!moreLoad[idx]) (e.currentTarget as HTMLButtonElement).style.borderColor = `var(--chart-${(idx % 5) + 1})`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
                      >
                        {moreLoad[idx]
                          ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading more topics...</>
                          : <><PlusCircle size={14} /> More topics like this</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", color: "var(--muted-foreground)" }}>
              <p>Enter your details above to generate a perfectly structured interview study plan.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
