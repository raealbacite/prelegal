"use client";

import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import NdaCreator from "@/components/NdaCreator";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginScreen onContinue={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Mutual NDA Creator
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat with the assistant to build a Mutual Non-Disclosure Agreement based on the Common
          Paper standard MNDA. It asks about the details, fills in the document as you go, and you
          can download it as a PDF.
        </p>
      </header>
      <NdaCreator />
    </div>
  );
}
