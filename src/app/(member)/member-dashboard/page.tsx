"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/shared/EmptyState";
import { formatDate } from "@/utils/formatDate";
import { fetchJson } from "@/lib/fetchJson";
import { MIN_MONTHLY_PV } from "@/utils/calculatePercentage";
import type { AttendanceStatus } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type DutyScheduleItem = {
  slotLabel: string;
  patternLabel: string;
  dateLabel: string;
  date: string;
};

type DutyResponse = {
  monthLabel: string;
  hasSewa?: boolean;
  schedule: DutyScheduleItem[];
};

type MemberStats = {
  percentage: number;
  percentageQualified?: boolean;
  minPresentRequired?: number;
  monthPvTotal?: number;
  present: number;
  pv: number;
  absent: number;
  todayMarked: boolean;
  todayStatus: AttendanceStatus | null;
  pendingToday: boolean;
  recent: Array<{ id: string; status: AttendanceStatus; date: string }>;
};

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

export default function MemberDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [duty, setDuty] = useState<DutyResponse | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const progress = useSimulatedProgress(loading);

  useEffect(() => {
    Promise.all([
      fetchJson<MemberStats>("/api/stats"),
      fetchJson<DutyResponse>("/api/duty"),
      fetchJson<Broadcast[]>("/api/broadcast"),
    ]).then(([statsRes, dutyRes, broadcastRes]) => {
      if (statsRes.ok && statsRes.data && !("error" in (statsRes.data as object))) {
        setStats(statsRes.data as MemberStats);
      }
      if (dutyRes.ok && dutyRes.data) {
        setDuty(dutyRes.data);
      }
      if (broadcastRes.ok && broadcastRes.data) {
        setBroadcasts(broadcastRes.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner label={t("loading")} progress={progress} showPercentage />;

  const minRequired = stats?.minPresentRequired ?? MIN_MONTHLY_PV;
  const monthPv = stats?.monthPvTotal ?? stats?.pv ?? 0;
  const percentageHint = `PV only · 4 PV = 100% · ${monthPv} PV this month`;

  const description = stats?.pendingToday
    ? "Your PV request is waiting for admin approval."
    : stats?.todayMarked
      ? `Today's attendance: ${stats.todayStatus} (approved).`
      : "Mark attendance inside the approved location.";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageHeader title={t("dashboard")} description="" />
        <Card className="!p-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
            {t("quick_actions")}
          </h2>
          <div className="flex gap-2">
            <Link href="/mark-attendance">
              <Button size="sm">{t("mark_attendance")}</Button>
            </Link>
            <Link href="/my-records">
              <Button size="sm" variant="secondary">
                {t("my_records")}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {stats?.pendingToday && (
        <div className="mb-6">
          <Alert variant="info">
            PV with live selfie submitted — admin approval pending. Only
            approved PV counts toward your attendance percentage (P does not).
          </Alert>
        </div>
      )}

      {monthPv > 0 && monthPv < minRequired && (
        <div className="mb-6">
          <Alert variant="info">
            Attendance % is based on <strong>PV only</strong> (not P).{" "}
            {minRequired} approved PV = 100%. You have {monthPv} PV — e.g. 4 PV =
            100%.
          </Alert>
        </div>
      )}

      {broadcasts.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="text-sm">📢</span> Notice Board
            </h2>
            {broadcasts.length > 1 && (
              <Link 
                href="/notices" 
                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider flex items-center gap-0.5 transition-colors"
              >
                See All
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {/* Show only the latest broadcast */}
            {(() => {
              const b = broadcasts[0];
              const isExpanded = expandedNoticeId === b.id;
              return (
                <div 
                  key={b.id} 
                  className={`p-2 rounded-lg border-l-3 shadow-sm relative overflow-hidden cursor-pointer hover:bg-opacity-90 transition-colors ${
                    b.type === "WARNING" ? "bg-orange-50 border-orange-500" :
                    b.type === "SUCCESS" ? "bg-green-50 border-green-500" :
                    "bg-blue-50 border-blue-500"
                  }`}
                  onClick={() => setExpandedNoticeId(isExpanded ? null : b.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col flex-1">
                      <h3 className={`font-semibold text-xs ${
                        b.type === "WARNING" ? "text-orange-900" :
                        b.type === "SUCCESS" ? "text-green-900" :
                        "text-blue-900"
                      }`}>{b.title}</h3>
                      <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-0.5">
                        {new Date(b.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter ${
                        b.type === "WARNING" ? "bg-orange-100 text-orange-700" :
                        b.type === "SUCCESS" ? "bg-green-100 text-green-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {b.type === "WARNING" ? "Important" : b.type === "SUCCESS" ? "New" : "Notice"}
                      </span>
                      {!isExpanded && (
                        <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-opacity-20" style={{ borderColor: 'inherit' }}>
                      <p className="text-[10px] text-slate-700 whitespace-pre-wrap leading-relaxed">{b.message}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedNoticeId(null);
                        }}
                        className="mt-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Show less
                      </button>
                    </div>
                  )}
                  
                  {/* Decorative background icon - subtle megaphone */}
                  <div className="absolute -right-2 -bottom-2 opacity-[0.03] pointer-events-none">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8l-5 5H4v-4h3l5-5v12zm6.5 4c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM16 5v1.51c2.21.82 4 3.08 4 5.49s-1.79 4.67-4 5.49V19c3.31-.91 6-4.11 6-7.5S19.31 5.91 16 5z" />
                    </svg>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label={t("attendance_pv_only")}
          value={`${stats?.percentage ?? 0}%`}
          sublabel={percentageHint}
          accent="brand"
        />
        <StatCard
          label={t("present_p")}
          value={stats?.present ?? 0}
          sublabel={t("not_counted_in_percent")}
          accent="green"
        />
        <StatCard
          label={t("pv_vardi")}
          value={stats?.pv ?? 0}
          sublabel={t("pv_counts_toward")}
          accent="amber"
        />
        <StatCard label={t("absent_a")} value={stats?.absent ?? 0} accent="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900 mb-0.5">
            {t("my_duty_this_month")}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {t("fixed_pattern").replace("{month}", duty?.monthLabel ?? "")}
          </p>
          {!duty?.hasSewa ? (
            <EmptyState
              title={t("no_sewa_assigned")}
              description={t("admin_will_set")}
            />
          ) : !duty.schedule.length ? (
            <p className="text-xs text-slate-500">
              {t("sewa_pattern_set")}
            </p>
          ) : (
            <div className="space-y-2">
              {duty.schedule.map((item) => (
                <div
                  key={`${item.slotLabel}-${item.date}`}
                  className="rounded-lg border border-brand-100 bg-brand-50/40 px-3 py-2"
                >
                  <p className="text-xs text-slate-700">{item.dateLabel}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            {t("this_months_attendance")}
          </h2>
          {!stats?.recent?.length ? (
            <EmptyState
              title={t("no_approved_records")}
              description={t("mark_attendance_at_centre")}
            />
          ) : (
            <div className="space-y-2">
              {stats.recent.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                >
                  <span className="text-xs font-medium text-slate-700">
                    {formatDate(row.date)}
                  </span>
                  <Badge status={row.status} />
                </div>
              ))}
            </div>
          )}
        </Card>


      </div>
    </div>
  );
}
