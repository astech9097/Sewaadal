"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import ApprovalBadge from "@/components/ui/ApprovalBadge";
import EmptyState from "@/components/shared/EmptyState";
import MemberSearchSelect from "@/components/ui/MemberSearchSelect";
import PendingApprovals from "@/components/admin/PendingApprovals";
import { formatDate, formatTime } from "@/utils/formatDate";
import { fetchJson } from "@/lib/fetchJson";
import type { ApprovalStatus, AttendanceStatus } from "@/types";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type Member = { id: string; name: string; username?: string; email?: string };
type AttendanceRow = {
  id: string;
  name: string;
  status: AttendanceStatus;
  approvalStatus: ApprovalStatus;
  areaName?: string;
  date: string;
};

function todayInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const membersProgress = useSimulatedProgress(membersLoading);
  const [tableLoading, setTableLoading] = useState(true);
  const tableProgress = useSimulatedProgress(tableLoading);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    status: "P" as AttendanceStatus,
    date: todayInputValue(),
    time: "",
  });

  const loadMembers = useCallback(async () => {
    const { data, ok } = await fetchJson<
      Array<Member & { role?: string }>
    >("/api/users");
    if (ok && data) {
      setMembers(
        data
          .filter((m) => m.role !== "ADMIN")
          .map(({ id, name, username, email }) => ({
          id,
          name,
          username: username ?? undefined,
          email: email ?? undefined,
        }))
      );
    }
    setMembersLoading(false);
  }, []);

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    const { data, ok } = await fetchJson<
      Array<{
        id: string;
        status: AttendanceStatus;
        approvalStatus: ApprovalStatus;
        areaName?: string;
        date: string;
        user?: { name: string };
      }>
    >("/api/attendance");

    if (ok && data) {
      setRows(
        data.map((item) => ({
          id: item.id,
          name: item.user?.name || "—",
          status: item.status,
          approvalStatus: item.approvalStatus,
          areaName: item.areaName,
          date: item.date,
        }))
      );
    }
    setTableLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
    loadTable();
  }, [loadMembers, loadTable]);

  const refreshAll = () => {
    loadTable();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError(false);

    const { ok, error: err } = await fetchJson("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: form.userId,
        status: form.status,
        date: form.date,
        time: form.time || undefined,
      }),
    });

    if (!ok) {
      setError(true);
      setMessage(err || "Failed to save attendance");
      return;
    }

    setMessage("Attendance saved.");
    setForm({ userId: "", status: "P", date: todayInputValue(), time: "" });
    refreshAll();
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        description=""
      />

      {message && (
        <div className="mb-6">
          <Alert variant={error ? "error" : "success"}>{message}</Alert>
        </div>
      )}

      <div className="mb-8">
        <PendingApprovals onUpdated={refreshAll} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Admin mark attendance
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            No GPS required. Search and select a member.
          </p>
          {membersLoading ? (
            <Spinner label="Loading members..." progress={membersProgress} showPercentage />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <MemberSearchSelect
                members={members}
                value={form.userId}
                onChange={(userId) => setForm({ ...form, userId })}
                required
              />
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as AttendanceStatus,
                  })
                }
                options={[
                  { value: "P", label: "P — Present" },
                  { value: "PV", label: "PV — Present in Vardi" },
                  { value: "A", label: "A — Absent" },
                ]}
              />
              <Input
                label="Date"
                name="date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
                placeholder=""
                required
              />
              <Input
                label="Time (optional)"
                name="time"
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm({ ...form, time: e.target.value })
                }
                placeholder=""
              />
              <Button type="submit" fullWidth disabled={!form.userId}>
                Save attendance
              </Button>
            </form>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            All records
          </h2>
          {tableLoading ? (
            <Spinner label="Loading records..." progress={tableProgress} showPercentage />
          ) : rows.length === 0 ? (
            <EmptyState title="No records yet" />
          ) : (
            <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Area</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={[
                        "border-b border-slate-100 last:border-0",
                        row.approvalStatus === "PENDING"
                          ? "bg-amber-50/50"
                          : "",
                      ].join(" ")}
                    >
                      <td className="py-3 font-medium text-slate-800">
                        {row.name}
                      </td>
                      <td className="py-3 text-sm text-brand-700 font-medium">
                        {row.areaName || "—"}
                      </td>
                      <td className="py-3 text-slate-600">
                        {formatDate(row.date)}
                        <span className="block text-xs text-slate-400">
                          {formatTime(row.date)}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge status={row.status} />
                      </td>
                      <td className="py-3">
                        <ApprovalBadge status={row.approvalStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
