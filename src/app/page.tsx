"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Brain, Target, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const { user, signOut, loading } = useAuth();

  return (
    <div className="min-h-screen pb-16">
      <header>
        <div className="layout-container">
          <div className="logo">
            <Target size={28} />
            AI Interview <span>Suite</span>
          </div>
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link href="/resume" style={{ fontWeight: 500 }}>Resume</Link>
            <Link href="/topics" style={{ fontWeight: 500 }}>Topics</Link>
            <Link href="/qa" style={{ fontWeight: 500 }}>Q&A</Link>
            <Link href="/mock-interview" style={{ fontWeight: 500 }}>Mock</Link>
            <ThemeToggle />
            <span style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />
            {loading ? (
              <span style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--muted)', animation: 'pulse 2s infinite' }} />
            ) : user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 600,
                  overflow: 'hidden'
                }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            ) : (
              <Link href="/signin" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LogIn size={14} /> Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="layout-container animate-fade-in" style={{ marginTop: '4rem' }}>
        <section style={{ textAlign: 'center', marginBottom: '5rem', maxWidth: '800px', margin: '0 auto 6rem' }}>
          <h1 className="gradient-text" style={{ fontSize: '3.5rem', lineHeight: '1.2', marginBottom: '1.5rem' }}>
            Elevate Your Career with AI-Powered Preparation
          </h1>
          <p className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '3rem', lineHeight: '1.6' }}>
            From building an ATS-friendly resume to mastering complex topics and acing your mock interview — all consolidated in one intelligent suite.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            <Link href="/resume" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Get Started <ArrowRight size={20} />
            </Link>
            <Link href="/topics" className="btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Explore Topics
            </Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <Link href="/resume">
            <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', background: 'var(--primary)', borderRadius: '50%', width: 'fit-content', marginBottom: '1.5rem', color: 'var(--primary-foreground)' }}>
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: '1.5rem' }}>AI Resume Builder</h3>
              <p className="text-muted" style={{ marginTop: '0.5rem', flex: 1, lineHeight: '1.5' }}>
                Generate a tailored, ATS-friendly resume optimizing action verbs and quantifiable metrics for your target role.
              </p>
            </div>
          </Link>

          <Link href="/qa">
            <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', background: 'var(--chart-2)', borderRadius: '50%', width: 'fit-content', marginBottom: '1.5rem', color: '#fff' }}>
                <MessageSquare size={24} />
              </div>
              <h3 style={{ fontSize: '1.5rem' }}>Interview Q&A</h3>
              <p className="text-muted" style={{ marginTop: '0.5rem', flex: 1, lineHeight: '1.5' }}>
                Prepare with AI-curated role-specific technical and behavioral questions, alongside ideal model answers.
              </p>
            </div>
          </Link>

          <Link href="/topics">
            <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', background: 'var(--chart-1)', borderRadius: '50%', width: 'fit-content', marginBottom: '1.5rem', color: 'var(--primary-foreground)' }}>
                <Brain size={24} />
              </div>
              <h3 style={{ fontSize: '1.5rem' }}>Study Concepts</h3>
              <p className="text-muted" style={{ marginTop: '0.5rem', flex: 1, lineHeight: '1.5' }}>
                Follow a progressive learning path with role-specific curated study materials to cover your core knowledge gaps.
              </p>
            </div>
          </Link>

          <Link href="/mock-interview">
            <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', background: 'var(--chart-3)', borderRadius: '50%', width: 'fit-content', marginBottom: '1.5rem', color: '#fff' }}>
                <Target size={24} />
              </div>
              <h3 style={{ fontSize: '1.5rem' }}>Mock Simulator</h3>
              <p className="text-muted" style={{ marginTop: '0.5rem', flex: 1, lineHeight: '1.5' }}>
                Engage in realistic conversational mock rounds. Get scored out of 10 and receive instant actionable feedback.
              </p>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
