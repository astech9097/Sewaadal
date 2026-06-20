"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import ApprovalBadge from "@/components/ui/ApprovalBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { formatDate, formatTime } from "@/utils/formatDate";
import type { ApprovalStatus, AttendanceStatus } from "@/types";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type Record = {
  id: string;
  status: AttendanceStatus;
  approvalStatus: ApprovalStatus;
  date: string;
  photoUrl?: string;
  rejectionNote?: string;
};

export default function MyRecordsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [stats, setStats] = useState({
    percentage: 0,
    total: 0,
    monthPv: 0,
    minRequired: 3,
  });
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);

  useEffect(() => {
    import("@/lib/fetchJson").then(({ fetchJson }) =>
      Promise.all([
        fetchJson<Record[]>("/api/attendance"),
        fetchJson<{
          percentage?: number;
          total?: number;
          monthPvTotal?: number;
          minPresentRequired?: number;
        }>("/api/stats"),
      ]).then(([attRes, statsRes]) => {
        if (attRes.ok && attRes.data) setRecords(attRes.data);
        if (statsRes.ok && statsRes.data) {
          const s = statsRes.data;
          setStats({
            percentage: s.percentage ?? 0,
            total: s.total ?? 0,
            monthPv: s.monthPvTotal ?? 0,
            minRequired: s.minPresentRequired ?? 3,
          });
        }
        setLoading(false);
      })
    );
  }, []);

  if (loading) return <Spinner label="Loading records..." progress={progress} showPercentage />;

  const approved = records.filter((r) => r.approvalStatus === "APPROVED");
  const pending = records.filter((r) => r.approvalStatus === "PENDING");
  const rejected = records.filter((r) => r.approvalStatus === "REJECTED");

  return (
    <div>
      <PageHeader
        title="My Records"
        description=""
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8 max-w-lg">
        <StatCard
          label="Attendance % (PV only)"
          value={`${stats.percentage}%`}
          sublabel={`${stats.monthPv} PV · 4 PV = 100% (${stats.minRequired}+ → above 100%)`}
          accent="brand"
        />
        <StatCard
          label="Marked this month"
          value={stats.total}
          accent="slate"
        />
      </div>

      {pending.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">
            Pending approval
          </h2>
          <div className="space-y-3">
            {pending.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {formatDate(row.date)}
                  </p>
                  <p className="text-xs text-slate-500">Awaiting admin</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={row.status} />
                  <ApprovalBadge status="PENDING" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {rejected.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50/50">
          <h2 className="text-lg font-semibold text-red-900 mb-3">
            Rejected
          </h2>
          <div className="space-y-3">
            {rejected.map((row) => (
              <div
                key={row.id}
                className="rounded-lg bg-white/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {formatDate(row.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={row.status} />
                    <ApprovalBadge status="REJECTED" />
                  </div>
                </div>
                {row.rejectionNote && (
                  <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                    <strong>Reason:</strong> {row.rejectionNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Approved history
        </h2>
        {approved.length === 0 ? (
          <EmptyState
            title="No approved records yet"
            description="P and A save instantly. PV appears here after admin approval."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Photo</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 font-medium text-slate-800">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3">
                      <Badge status={row.status} />
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatTime(row.date)}
                    </td>
                    <td className="py-3">
                      {row.photoUrl ? (
                        <a
                          href={row.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline text-xs font-medium"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
