"use client";

import { useState } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import AppHeader from "@/components/shared/AppHeader";
import PageTransition from "@/components/ui/PageTransition";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen page-gradient overflow-x-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          badge="Admin"
          title="Dhan Nirankar Ji"
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
