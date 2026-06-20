"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import ApprovalBadge from "@/components/ui/ApprovalBadge";
import Input from "@/components/ui/Input";
import { formatDateTime } from "@/utils/formatDate";
import { fetchJson } from "@/lib/fetchJson";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type PendingRecord = {
  id: string;
  status: "P" | "PV";
  date: string;
  areaName?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  user?: { name: string; username?: string | null; email?: string | null };
};

export default function PendingApprovals({
  onUpdated,
}: {
  onUpdated?: () => void;
}) {
  const [items, setItems] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [bulkRejectionNote, setBulkRejectionNote] = useState("");
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, ok } = await fetchJson<PendingRecord[]>(
      "/api/attendance?pending=true"
    );
    if (ok && data) {
      setItems(data);
      setSelected(new Set());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const handleApprove = async (id: string) => {
    setActingId(id);
    setMessage("");
    setError(false);

    const { ok, error: err } = await fetchJson(`/api/attendance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });

    setActingId(null);
    if (!ok) {
      setError(true);
      setMessage(err || "Action failed");
      return;
    }

    setMessage("Attendance approved.");
    load();
    onUpdated?.();
  };

  const handleReject = async (id: string, note: string) => {
    setActingId(id);
    setMessage("");
    setError(false);

    const { ok, error: err } = await fetchJson(`/api/attendance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionNote: note || "Rejected by admin" }),
    });

    setActingId(null);
    setRejectingId(null);
    setRejectionNote("");
    if (!ok) {
      setError(true);
      setMessage(err || "Action failed");
      return;
    }

    setMessage("Attendance rejected.");
    load();
    onUpdated?.();
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    setMessage("");
    setError(false);

    const { data, ok, error: err } = await fetchJson<{ message?: string }>(
      "/api/attendance/bulk",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "approve" }),
      }
    );

    setBulkLoading(false);
    if (!ok) {
      setError(true);
      setMessage(err || "Bulk action failed");
      return;
    }

    setMessage(data?.message || "Bulk action completed.");
    load();
    onUpdated?.();
  };

  const handleBulkReject = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    setMessage("");
    setError(false);

    const { data, ok, error: err } = await fetchJson<{ message?: string }>(
      "/api/attendance/bulk",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "reject", rejectionNote: bulkRejectionNote || "Rejected by admin" }),
      }
    );

    setBulkLoading(false);
    setShowBulkRejectModal(false);
    setBulkRejectionNote("");
    if (!ok) {
      setError(true);
      setMessage(err || "Bulk action failed");
      return;
    }

    setMessage(data?.message || "Bulk action completed.");
    load();
    onUpdated?.();
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Attendance approval queue
          </h2>
          <p className="text-sm text-slate-500">
            Member submissions stay pending until you approve. Select multiple for bulk
            action.
          </p>
        </div>
        {!loading && items.length > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            {items.length} pending
          </span>
        )}
      </div>

      {message && (
        <div className="mb-4">
          <Alert variant={error ? "error" : "success"}>{message}</Alert>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-brand-500"
            />
            Select all ({selected.size}/{items.length})
          </label>
          <Button
            size="sm"
            disabled={selected.size === 0 || bulkLoading}
            onClick={handleBulkApprove}
          >
            Approve selected
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={selected.size === 0 || bulkLoading}
            onClick={() => setShowBulkRejectModal(true)}
          >
            Reject selected
          </Button>
        </div>
      )}

      {showBulkRejectModal && (
        <div className="mb-4 p-4 border border-red-200 rounded-xl bg-red-50/50">
          <h3 className="text-sm font-semibold text-red-900 mb-2">
            Reject selected attendance
          </h3>
          <Input
            label="Rejection note (optional)"
            name="bulkRejectionNote"
            value={bulkRejectionNote}
            onChange={(e) => setBulkRejectionNote(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={bulkLoading}
              onClick={handleBulkReject}
            >
              Confirm reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowBulkRejectModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading pending requests..." progress={progress} showPercentage />
      ) : items.length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="Member attendance submissions appear here until you approve them."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={[
                "rounded-xl border p-4",
                selected.has(item.id)
                  ? "border-brand-300 bg-brand-50/40"
                  : "border-amber-200/80 bg-amber-50/30",
              ].join(" ")}
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-500"
                />
                <div className="flex flex-1 flex-col gap-4 sm:flex-row">
                  {item.photoUrl && (
                    <a
                      href={item.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={item.photoUrl}
                        alt={`Selfie — ${item.user?.name}`}
                        loading="lazy"
                        className="h-36 w-36 rounded-xl object-cover border border-slate-200 shadow-sm"
                      />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {item.user?.name ?? "Member"}
                      </p>
                      <Badge status={item.status} />
                      <ApprovalBadge status="PENDING" />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {item.user?.username ?? item.user?.email ?? "—"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDateTime(item.date)}
                    </p>
                    {item.areaName && (
                      <p className="mt-1 text-sm font-medium text-brand-700">
                        Area: {item.areaName}
                      </p>
                    )}
                    {rejectingId === item.id ? (
                      <div className="mt-4 space-y-3">
                        <Input
                          label="Rejection note (optional)"
                          name="rejectionNote"
                          value={rejectionNote}
                          onChange={(e) => setRejectionNote(e.target.value)}
                          placeholder="Enter reason for rejection..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={actingId === item.id || bulkLoading}
                            onClick={() => handleReject(item.id, rejectionNote)}
                          >
                            Confirm reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionNote("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={actingId === item.id || bulkLoading}
                          onClick={() => handleApprove(item.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={actingId === item.id || bulkLoading}
                          onClick={() => setRejectingId(item.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
