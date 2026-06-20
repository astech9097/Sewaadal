"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import BrandLogo from "@/components/shared/BrandLogo";
import { useLanguage } from "@/context/LanguageContext";

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function AdminSidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();

  const role = (session?.user as { role?: string })?.role;

  const allLinks = [
    { href: "/admin-dashboard", label: t("dashboard"), icon: "◉", roles: ["ADMIN", "SUPERADMIN"] },
    { href: "/members", label: t("members"), icon: "👥", roles: ["ADMIN", "SUPERADMIN"] },
    { href: "/attendance", label: t("attendance"), icon: "✓", roles: ["ADMIN", "SUPERADMIN"] },
    { href: "/reports", label: t("reports"), icon: "📊", roles: ["ADMIN", "SUPERADMIN"] },
    { href: "/broadcast", label: "Broadcast", icon: "📢", roles: ["ADMIN", "SUPERADMIN"] },
    { href: "/settings", label: t("settings"), icon: "⚙", roles: ["ADMIN", "SUPERADMIN"] },
    { href: "/change-password", label: t("change_password"), icon: "🔐", roles: ["ADMIN", "SUPERADMIN", "INCHARGE"] },
  ];

  const adminLinks = allLinks.filter(link => role && link.roles.includes(role));

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar aside */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto lg:flex lg:shrink-0 min-h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} />
            <div>
              <p className="text-lg font-bold tracking-tight">Sewadal</p>
              <p className="text-xs text-slate-400">{t("admin_panel")}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-white/10 text-slate-400 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {adminLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span className="text-base opacity-90" aria-hidden>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
