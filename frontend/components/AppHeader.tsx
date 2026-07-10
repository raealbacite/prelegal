"use client";

import { useAuth } from "@/lib/authContext";

export type AppView = "create" | "history";

interface AppHeaderProps {
  view: AppView;
  onNewDocument: () => void;
  onShowHistory: () => void;
}

export default function AppHeader({ view, onNewDocument, onShowHistory }: AppHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight text-navy dark:text-white">
            Prelegal
          </span>
          <nav className="flex items-center gap-1">
            <NavButton active={view === "create"} onClick={onNewDocument}>
              New Document
            </NavButton>
            <NavButton active={view === "history"} onClick={onShowHistory}>
              My Documents
            </NavButton>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <span className="hidden text-sm text-gray-text sm:inline">{user.email}</span>
          ) : null}
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-navy transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-blue-primary/10 text-blue-primary"
          : "text-gray-text hover:text-navy dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
