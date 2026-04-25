"use client";

import React, { useEffect, useState, useRef } from "react";

// ─── Frame timings (ms each frame shows) ─────────────────────────────────────
const FRAME_MS = 260;
const TOTAL_FRAMES = 9;

// ─── Gold color palette ───────────────────────────────────────────────────────
const GOLD_BRIGHT = "#FFD700";
const GOLD_MID    = "#FFA500";
const GOLD_DARK   = "#B8860B";

interface Props {
  onComplete: () => void;
}

export default function AptitudeArcLoader({ onComplete }: Props) {
  const [frame, setFrame] = useState(0);
  const [nameVisible, setNameVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (frame >= TOTAL_FRAMES - 1) {
      setNameVisible(true);
      const holdTimer = setTimeout(() => {
        setFadeOut(true);
        const doneTimer = setTimeout(() => onCompleteRef.current(), 650);
        return () => clearTimeout(doneTimer);
      }, 1000);
      return () => clearTimeout(holdTimer);
    }
    const t = setTimeout(() => setFrame((f) => f + 1), FRAME_MS);
    return () => clearTimeout(t);
  }, [frame]);

  // ── derived progress values ───────────────────────────────────────────────
  const wire     = Math.min(Math.max((frame - 0) / 3, 0), 1); // 0–3  → stroke draw
  const solid    = Math.min(Math.max((frame - 3) / 3, 0), 1); // 3–6  → fill appears
  const glow     = Math.min(Math.max((frame - 4) / 3, 0), 1); // 4–7  → glow intensity
  const bgFade   = Math.min(frame / 6, 1);                     // bg circle brightens

  const DASH = 260;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#050A1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: fadeOut ? 0 : 1,
        transition: fadeOut ? "opacity 0.65s ease" : "none",
        pointerEvents: fadeOut ? "none" : "all",
      }}
      aria-label="Loading Aptitude Arc"
    >
      {/* ── Deep navy radial bg ─────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 70% 65% at 50% 50%, #081530 0%, #050A1A 100%)`,
      }} />

      {/* ── Expanding gold glow circle ───────────────────────────────────── */}
      <div style={{
        position: "absolute",
        width: 380, height: 380,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,165,0,${bgFade * 0.28}) 0%, transparent 70%)`,
        transform: `scale(${0.5 + frame * 0.1})`,
        transition: `all ${FRAME_MS}ms ease`,
        pointerEvents: "none",
      }} />

      {/* ── SVG Logo ─────────────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 220 240"
        width={200} height={200}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          overflow: "visible",
          filter: glow > 0.2
            ? `drop-shadow(0 0 ${12 + glow * 28}px rgba(255,165,0,${0.3 + glow * 0.5}))`
            : "drop-shadow(0 0 12px rgba(255,140,0,0.3))",
          transition: `filter ${FRAME_MS}ms ease`,
          marginBottom: "1.5rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        <defs>
          <linearGradient id="aa-gold" x1="0%" y1="0%" x2="100%" y2="120%">
            <stop offset="0%"   stopColor={GOLD_BRIGHT} />
            <stop offset="45%"  stopColor={GOLD_MID} />
            <stop offset="100%" stopColor={GOLD_DARK} />
          </linearGradient>
          <linearGradient id="aa-bevel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.38)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
          </linearGradient>
          <filter id="aa-wire-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
        </defs>

        {/* ── WIRE FRAME LAYER (frames 0–3) ─────────────────────────────── */}
        <g
          filter="url(#aa-wire-glow)"
          style={{
            opacity: Math.max(0, wire - solid * 0.9),
            transition: `opacity ${FRAME_MS}ms ease`,
          }}
        >
          {/* Left leg */}
          <path
            d="M 28 218 L 110 26"
            stroke={GOLD_BRIGHT} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={DASH}
            strokeDashoffset={DASH * (1 - wire)}
            style={{ transition: `stroke-dashoffset ${FRAME_MS}ms ease` }}
          />
          {/* Right leg */}
          <path
            d="M 110 26 L 190 218"
            stroke={GOLD_MID} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={DASH}
            strokeDashoffset={DASH * (1 - wire)}
            style={{ transition: `stroke-dashoffset ${FRAME_MS}ms ease` }}
          />
          {/* Crossbar */}
          <path
            d="M 63 148 L 157 148"
            stroke={GOLD_BRIGHT} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={90}
            strokeDashoffset={90 * (1 - wire)}
            style={{ transition: `stroke-dashoffset ${FRAME_MS}ms ease` }}
          />
          {/* Swoosh arc */}
          <path
            d="M 152 58 Q 248 134 172 222"
            stroke={GOLD_MID} strokeWidth="2" strokeLinecap="round" fill="none"
            strokeDasharray={DASH}
            strokeDashoffset={DASH * (1 - wire)}
            style={{ transition: `stroke-dashoffset ${FRAME_MS}ms ease` }}
          />
        </g>

        {/* ── SOLID GOLDEN FILL LAYER (frames 3–8) ──────────────────────── */}
        <g style={{
          opacity: solid,
          transition: `opacity ${FRAME_MS}ms ease`,
        }}>
          {/* Left thick leg */}
          <path d="M 20 218 L 105 22 L 124 22 L 49 218 Z" fill="url(#aa-gold)" />
          {/* Right thick leg */}
          <path d="M 180 218 L 105 22 L 124 22 L 200 218 Z" fill="url(#aa-gold)" />
          {/* Crossbar */}
          <rect x="58" y="138" width="104" height="21" rx="4" fill="url(#aa-gold)" />
          {/* Swoosh (diagonal stripe cutting through right leg) */}
          <path
            d="M 146 50 Q 232 124 178 218 L 162 208 Q 212 128 130 56 Z"
            fill="url(#aa-gold)" opacity="0.92"
          />
          {/* 3-D bevel highlight */}
          <path d="M 20 218 L 105 22 L 124 22 L 49 218 Z"   fill="url(#aa-bevel)" opacity="0.28" />
          <path d="M 180 218 L 105 22 L 124 22 L 200 218 Z" fill="url(#aa-bevel)" opacity="0.18" />
          {/* Apex specular */}
          <ellipse
            cx="114" cy="38" rx="13" ry="7"
            fill="rgba(255,255,255,0.38)"
            style={{
              opacity: glow > 0.4 ? 0.85 : 0,
              transition: `opacity ${FRAME_MS}ms ease`,
            }}
          />
        </g>

        {/* ── PARTICLE SPARKS (frames 1–5) ───────────────────────────────── */}
        {frame >= 1 && frame <= 5 && (
          <g>
            {[
              [110, 26], [63, 148], [157, 148], [190, 218], [152, 58], [28, 218],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx + Math.sin(frame * 1.7 + i) * 6}
                cy={cy + Math.cos(frame * 1.3 + i) * 4}
                r={2.5}
                fill={GOLD_BRIGHT}
                style={{ filter: "blur(1px)", opacity: 0.9 }}
              />
            ))}
          </g>
        )}
      </svg>

      {/* ── Brand Name ───────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "baseline",
        gap: 0,
        fontFamily: "var(--font-sans, Inter, sans-serif)",
        fontSize: "2.1rem",
        fontWeight: 800,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        opacity: nameVisible ? 1 : 0,
        transform: nameVisible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        textShadow: `0 0 24px rgba(255,215,0,0.5), 0 0 48px rgba(255,165,0,0.3)`,
        marginBottom: "2rem",
      }}>
        <span style={{
          background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD_MID} 55%, ${GOLD_DARK} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Aptitude
        </span>
        <span style={{
          color: "#dde3f0",
          WebkitTextFillColor: "#dde3f0",
          fontWeight: 300,
          letterSpacing: "0.1em",
          marginLeft: "0.3rem",
        }}>
          Arc
        </span>
      </div>

      {/* ── Frame progress dots ───────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: "2.2rem",
        display: "flex", gap: "8px", alignItems: "center", zIndex: 3,
      }}>
        {Array.from({ length: TOTAL_FRAMES }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === frame ? 20 : 7,
              height: 7,
              borderRadius: "999px",
              background: i <= frame ? GOLD_BRIGHT : "transparent",
              border: `1.5px solid ${i <= frame ? GOLD_BRIGHT : "rgba(255,255,255,0.2)"}`,
              opacity: i <= frame ? 1 : 0.3,
              transition: "all 0.18s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
