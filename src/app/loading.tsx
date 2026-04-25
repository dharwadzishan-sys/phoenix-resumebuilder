"use client";

/**
 * Next.js App Router global loading boundary.
 * Shows a minimal non-blocking spinner during page suspense.
 * Replaces the old CosmicParallaxBg that was causing navigation crashes.
 */
export default function Loading() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "var(--background, #050A1A)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      {/* Spinning ring */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "3px solid rgba(245,158,11,0.15)",
        borderTop: "3px solid #F59E0B",
        animation: "spin 0.85s linear infinite",
      }} />

      {/* Brand name */}
      <span style={{
        fontSize: "0.85rem",
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: "#F59E0B",
        opacity: 0.75,
        textTransform: "uppercase",
      }}>
        Aptitude Arc
      </span>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
