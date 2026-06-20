"use client";

import { useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "Member";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Member
        </p>
        <p className="text-lg font-semibold text-slate-900">Welcome back</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          <p className="text-xs text-slate-500">Sewadal Member</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
          {name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
