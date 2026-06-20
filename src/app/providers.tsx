"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/context/LanguageContext";
import ProgressBar from "@/components/ui/ProgressBar";
import { Suspense } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}