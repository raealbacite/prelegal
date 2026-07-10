"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UNAUTHORIZED_EVENT } from "./api";
import { User } from "./types";
import * as auth from "./auth";

interface AuthContextValue {
  user: User | null;
  /** True until the initial "am I signed in?" check has resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, validate any stored token against the backend.
  useEffect(() => {
    let cancelled = false;
    auth
      .fetchCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Drop the session if any authenticated request comes back 401 (the token
  // was cleared by apiFetch; here we clear the in-memory user so the UI reacts).
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function signIn(email: string, password: string) {
    setUser(await auth.signIn(email, password));
  }

  async function signUp(email: string, password: string) {
    setUser(await auth.signUp(email, password));
  }

  function signOut() {
    auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
