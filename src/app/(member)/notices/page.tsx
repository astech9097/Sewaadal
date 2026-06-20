"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { fetchJson } from "@/lib/fetchJson";
import { useLanguage } from "@/context/LanguageContext";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

export default function NoticesPage() {
  const { t } = useLanguage();
  const [notices, setNotices] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);

  useEffect(() => {
    fetchJson<Broadcast[]>("/api/broadcast").then((res) => {
      if (res.ok && res.data) {
        setNotices(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner label={t("loading")} progress={progress} showPercentage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/member-dashboard" 
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <PageHeader title="Notice History" description="View all past announcements and updates." />
      </div>

      {!notices.length ? (
        <EmptyState title="No notices found" description="When admin sends a notice, it will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notices.map((b) => (
            <Card 
              key={b.id} 
              className={`!p-5 border-l-4 shadow-sm relative overflow-hidden ${
                b.type === "WARNING" ? "bg-orange-50/50 border-orange-500" :
                b.type === "SUCCESS" ? "bg-green-50/50 border-green-500" :
                "bg-blue-50/50 border-blue-500"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <h3 className={`font-bold text-lg ${
                    b.type === "WARNING" ? "text-orange-900" :
                    b.type === "SUCCESS" ? "text-green-900" :
                    "text-blue-900"
                  }`}>{b.title}</h3>
                  <span className="text-xs font-bold opacity-40 uppercase tracking-widest mt-0.5">
                    {new Date(b.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  b.type === "WARNING" ? "bg-orange-100 text-orange-700" :
                  b.type === "SUCCESS" ? "bg-green-100 text-green-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {b.type}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">{b.message}</p>
                  
                  {/* Decorative background icon - subtle megaphone */}
                  <div className="absolute -right-2 -bottom-2 opacity-[0.03] pointer-events-none">
                    <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8l-5 5H4v-4h3l5-5v12zm6.5 4c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM16 5v1.51c2.21.82 4 3.08 4 5.49s-1.79 4.67-4 5.49V19c3.31-.91 6-4.11 6-7.5S19.31 5.91 16 5z" />
                    </svg>
                  </div>
                </Card>
          ))}
        </div>
      )}
    </div>
  );
}
