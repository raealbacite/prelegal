"use client";

import { useState } from "react";

type LoginScreenProps = {
  onContinue: () => void;
};

export default function LoginScreen({ onContinue }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#032147] dark:text-zinc-50">
            Welcome to Prelegal
          </h1>
          <p className="text-sm text-[#888888] dark:text-zinc-400">
            Sign in to start drafting your agreement.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-[#032147] dark:text-zinc-200">
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Doe"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-[#209dd7] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[#032147] dark:text-zinc-200">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jane@example.com"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-[#209dd7] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#753991] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
