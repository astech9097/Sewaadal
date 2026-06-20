"use client";

import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";
import BrandLogo from "@/components/shared/BrandLogo";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

type AppHeaderProps = {
  badge: string;
  title: string;
  onMenuClick?: () => void;
};

export default function AppHeader({ badge, title, onMenuClick }: AppHeaderProps) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "User";
  const role = (session?.user as { role?: string })?.role ?? badge.toUpperCase();
  const roleLabel = 
    role === "SUPERADMIN" ? "Superadmin" : 
    role === "ADMIN" ? "Admin" : 
    role === "INCHARGE" ? "Group Incharge" :
    "Member";

  // For admin/superadmin: show badge and title, right side shows name and role
  // For member/incharge: show badge (Member) and title, right side shows name
  const showBadge = true;
  const displayTitle = title;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-3 sm:px-6 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none lg:hidden flex-shrink-0"
            aria-label="Open menu"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          {showBadge && (
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-brand-600">
              {badge}
            </p>
          )}
          {(role === "MEMBER" || role === "INCHARGE") ? (
            <p 
              className="text-[11px] sm:text-xs font-semibold text-slate-900 truncate" 
              title={name}
            >
              {name}
            </p>
          ) : (
            <p 
              className="text-[11px] sm:text-xs font-semibold text-slate-900 truncate" 
              title={displayTitle}
            >
              {displayTitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        <LanguageSwitcher />
        {(role === "ADMIN" || role === "SUPERADMIN") && (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800 truncate" title={name}>{name}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
            <div className="block text-right sm:hidden max-w-[100px]">
              <p className="text-xs font-semibold text-slate-800 truncate" title={name}>{name}</p>
            </div>
          </>
        )}
        <BrandLogo size={30} className="flex-shrink-0 hidden sm:block" />
        <LogoutButton variant="header" className="flex-shrink-0" />
      </div>
    </header>
  );
}
