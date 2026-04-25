"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        position: "relative",
        width: "52px",
        height: "28px",
        borderRadius: "9999px",
        border: "1px solid var(--border)",
        background: isDark
          ? "linear-gradient(135deg, #1e293b, #0f172a)"
          : "linear-gradient(135deg, #fef3c7, #fde68a)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: "0 3px",
        transition: "background 0.4s ease",
        flexShrink: 0,
      }}
    >
      {/* Sliding knob */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "linear-gradient(135deg, #f59e0b, #ea580c)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDark
            ? "0 0 8px rgba(245, 158, 11, 0.5)"
            : "0 0 8px rgba(234, 88, 12, 0.4)",
          marginLeft: isDark ? "auto" : "0",
        }}
      >
        {isDark ? (
          <Moon size={12} color="#000" strokeWidth={2.5} />
        ) : (
          <Sun size={12} color="#fff" strokeWidth={2.5} />
        )}
      </motion.div>
    </button>
  );
}
