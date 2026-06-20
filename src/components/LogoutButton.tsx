"use client";

import { signOut } from "next-auth/react";

type LogoutButtonProps = {
  className?: string;
  variant?: "sidebar" | "header";
};

export default function LogoutButton({
  className = "",
  variant = "sidebar",
}: LogoutButtonProps) {
  const styles =
    variant === "header"
      ? "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      : "rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20";

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={[styles, className].join(" ")}
    >
      Sign out
    </button>
  );
}
