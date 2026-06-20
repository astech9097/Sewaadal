"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import ApprovalBadge from "@/components/ui/ApprovalBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatDateTime } from "@/utils/formatDate";
import { STATUS_LABELS } from "@/lib/attendance";
import type { ApprovalStatus, AttendanceStatus } from "@/types";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type ActivityItem = {
  id: string;
  status: AttendanceStatus;
  approvalStatus: ApprovalStatus;
  date: string;
  photoUrl?: string;
  rejectionNote?: string;
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);

  useEffect(() => {
    fetch("/api/attendance")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading activity..." progress={progress} showPercentage />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Activity"
        description=""
      />

      <Card>
        {items.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="relative space-y-0">
            {items.map((item, index) => (
              <li key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
                {index < items.length - 1 && (
                  <span
                    className="absolute left-[11px] top-6 h-full w-px bg-slate-200"
                    aria-hidden
                  />
                )}
                <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white" />
                <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {item.approvalStatus === "PENDING"
                        ? "Submitted PV for approval"
                        : item.approvalStatus === "REJECTED"
                          ? "PV rejected"
                          : `Marked ${STATUS_LABELS[item.status]}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge status={item.status} />
                      <ApprovalBadge status={item.approvalStatus} />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(item.date)}
                  </p>
                  {item.rejectionNote && (
                    <p className="mt-2 text-sm text-rose-600">
                      {item.rejectionNote}
                    </p>
                  )}
                  {item.photoUrl && (
                    <a
                      href={item.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline"
                    >
                      View selfie
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
