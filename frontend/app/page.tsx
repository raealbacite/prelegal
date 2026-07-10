"use client";

import { useAuth } from "@/lib/authContext";
import AuthScreen from "@/components/auth/AuthScreen";
import AppShell from "@/components/AppShell";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-gray-text">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <AppShell />;
}
