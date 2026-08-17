"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function DashboardSignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await signOut({ callbackUrl: "/login", redirect: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}
