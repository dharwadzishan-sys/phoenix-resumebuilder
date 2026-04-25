"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import ResumeBuilder from "@/components/ResumeBuilder";

export default function ResumePage() {
  return (
    <div style={{ minHeight: "100vh", paddingBottom: "4rem" }}>
      {/* Header */}
      <header className="no-print">
        <div
          className="layout-container"
          style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}
        >
          <Link href="/" className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>
            <ArrowLeft size={20} /> Back
          </Link>
          <div className="logo" style={{ fontSize: "1.25rem" }}>
            <FileText size={24} />
            Resume <span>Builder</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-container animate-fade-in" style={{ marginTop: "2rem" }}>
        <div className="text-center mb-8 no-print">
          <h1 className="gradient-text" style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>
            Build Your Professional Resume
          </h1>
          <p className="text-muted" style={{ fontSize: "1rem" }}>
            Fill in your details step by step — save to cloud, preview, and export as PDF
          </p>
        </div>

        <ResumeBuilder />
      </main>
    </div>
  );
}
