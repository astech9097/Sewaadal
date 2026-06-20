"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import ApprovalBadge from "@/components/ui/ApprovalBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatDateTime } from "@/utils/formatDate";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";
import { useLanguage } from "@/context/LanguageContext";
import type { ApprovalStatus, AttendanceStatus } from "@/types";

type Stats = {
  totalMembers: number;
  pendingCount: number;
  today: { present: number; pv: number; absent: number; total: number };
  recentAttendance: Array<{
    id: string;
    status: AttendanceStatus;
    approvalStatus: ApprovalStatus;
    date: string;
    user?: { name: string };
  }>;
};

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);

  useEffect(() => {
    import("@/lib/fetchJson").then(({ fetchJson }) =>
      fetchJson<Stats>("/api/stats").then(({ data, ok }) => {
        if (ok && data && !("error" in (data as object))) setStats(data as Stats);
        setLoading(false);
      })
    );
  }, []);

  if (loading) return <Spinner label={t("loading")} progress={progress} showPercentage />;

  const today = stats?.today ?? { present: 0, pv: 0, absent: 0, total: 0 };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageHeader
          title={t("admin_dashboard")}
          description=""
          action={
            (stats?.pendingCount ?? 0) > 0 ? (
              <Link href="/attendance">
                <Button variant="secondary" size="sm">
                  {stats?.pendingCount} {t("pv_pending")} →
                </Button>
              </Link>
            ) : undefined
          }
        />
        <Card className="!p-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
            {t("quick_actions")}
          </h2>
          <div className="flex gap-2">
            <Link href="/attendance">
              <Button size="sm">{t("mark_attendance")}</Button>
            </Link>
            {isAdmin && (
              <Link href="/members">
                <Button size="sm" variant="secondary">
                  {t("add_member")}
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label={t("total_members")}
          value={stats?.totalMembers ?? 0}
          accent="blue"
        />
        <StatCard
          label={t("present_today")}
          value={today.present}
          accent="green"
        />
        <StatCard label={t("pv_today")} value={today.pv} accent="amber" />
        <StatCard label={t("absent_today")} value={today.absent} accent="rose" />
        <StatCard
          label={t("pv_pending")}
          value={stats?.pendingCount ?? 0}
          accent="brand"
          sublabel={t("needs_approval")}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("recent_attendance")}
          </h2>
          <div className="mt-3 space-y-2">
            {!stats?.recentAttendance?.length ? (
              <EmptyState
                title={t("no_attendance_yet")}
                description={t("attendance_records_appear")}
              />
            ) : (
              stats.recentAttendance.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {row.user?.name ?? "Unknown"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDateTime(row.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge status={row.status} />
                    <ApprovalBadge status={row.approvalStatus} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>


      </div>
    </div>
  );
}
