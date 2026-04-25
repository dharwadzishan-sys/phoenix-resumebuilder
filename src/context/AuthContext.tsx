"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { apiCall } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Sync user profile to backend on login
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          await apiCall("/api/auth/sync", { method: "POST", token });
        } catch (err) {
          console.warn("Profile sync failed (non-critical):", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(message);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign in failed";
      setError(message);
      throw err;
    }
  };

  const signInWithGithub = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, githubProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "GitHub sign in failed";
      setError(message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setError(message);
    }
  };

  const getToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGithub,
        signOut,
        getToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
