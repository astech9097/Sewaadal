"use client";

import { useState } from "react";
import MemberSidebar from "@/components/member/MemberSidebar";
import AppHeader from "@/components/shared/AppHeader";
import PageTransition from "@/components/ui/PageTransition";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen page-gradient overflow-x-hidden">
      <MemberSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          badge="Member"
          title="Attendance"
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
