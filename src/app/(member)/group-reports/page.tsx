"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import ApprovalBadge from "@/components/ui/ApprovalBadge";
import EmptyState from "@/components/shared/EmptyState";
import Button from "@/components/ui/Button";
import { formatDate, formatTime } from "@/utils/formatDate";
import { fetchJson } from "@/lib/fetchJson";
import type { ApprovalStatus, AttendanceStatus } from "@/types";

import Select from "@/components/ui/Select";
import MemberSearchSelect from "@/components/ui/MemberSearchSelect";
import { useLanguage } from "@/context/LanguageContext";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type Record = {
  id: string;
  status: AttendanceStatus;
  approvalStatus: ApprovalStatus;
  areaName?: string;
  date: string;
  user?: { 
    id: string; 
    name: string; 
    group?: number | null;
    sewas?: { slot: string }[];
  };
  approvedByUser?: { name: string };
};

type UserOption = {
  id: string;
  name: string;
};

export default function GroupReportsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as { role?: string; group?: number } | undefined;
  const isIncharge = currentUser?.role === "INCHARGE";

  const { t } = useLanguage();
  const [records, setRecords] = useState<Record[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    present: 0,
    pv: 0,
    absent: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  // Filter state for inputs (pending)
  const [pendingFilters, setPendingFilters] = useState(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: startOfMonth.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      status: "ALL" as const,
      member: "ALL",
      group: "ALL",
    };
  });

  // Actual applied filters
  const [appliedFilters, setAppliedFilters] = useState(pendingFilters);

  const loadData = async (filters = appliedFilters) => {
    setLoading(true);
    
    try {
      const startParts = filters.start.split("-").map(Number);
      const endParts = filters.end.split("-").map(Number);
      
      if (startParts.length !== 3 || endParts.length !== 3) {
        throw new Error("Invalid date format");
      }

      const start = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
      const endWithBuffer = new Date(end.getTime() + 24 * 60 * 60 * 1000);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date values");
      }

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: endWithBuffer.toISOString(),
      });

      if (filters.member && filters.member !== "ALL") {
        params.append("userId", filters.member);
      }

      if (filters.status && filters.status !== "ALL") {
        params.append("status", filters.status);
      }

      if (filters.group && filters.group !== "ALL") {
        params.append("group", filters.group);
      }

      const [statsRes, attRes, usersRes] = await Promise.all([
        fetchJson<{
          totalMembers?: number;
          today?: { present: number; pv: number; absent: number };
          pendingCount?: number;
        }>("/api/stats"),
        fetchJson<Record[]>(`/api/attendance?${params.toString()}`),
        fetchJson<UserOption[]>("/api/users"),
      ]);

      if (statsRes.ok && statsRes.data) {
        const s = statsRes.data;
        setStats({
          totalMembers: s.totalMembers ?? 0,
          present: s.today?.present ?? 0,
          pv: s.today?.pv ?? 0,
          absent: s.today?.absent ?? 0,
          pendingCount: s.pendingCount ?? 0,
        });
      }
      if (attRes.ok && attRes.data) {
        setRecords(attRes.data);
      }
      if (usersRes.ok && usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (err) {
      console.error("Error in loadData:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isIncharge && currentUser?.group) {
      const g = String(currentUser.group);
      const newFilters = { ...pendingFilters, group: g };
      setPendingFilters(newFilters);
      setAppliedFilters(newFilters);
      loadData(newFilters);
    } else {
      loadData();
    }
  }, [isIncharge, currentUser?.group]);

  const handleApplyFilter = () => {
    setAppliedFilters(pendingFilters);
    loadData(pendingFilters);
  };

  const handleResetFilter = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const reset = {
      start: startOfMonth.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      status: "ALL" as const,
      member: "ALL",
      group: isIncharge && currentUser?.group ? String(currentUser.group) : "ALL",
    };
    setPendingFilters(reset);
    setAppliedFilters(reset);
    loadData(reset);
  };

  const filtered = (records || []).filter((r) => {
    if (!r) return false;
    const matchesApproval = 
      filter === "all" || 
      (filter === "approved" && r.approvalStatus === "APPROVED") ||
      (filter === "pending" && r.approvalStatus === "PENDING");
    return matchesApproval;
  });

  const downloadExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const data = filtered.map((r) => ({
      Name: r.user?.name || "—",
      Group: r.user?.group ? `${t("group")} ${r.user.group}` : "—",
      Area: r.areaName || "—",
      Date: formatDate(r.date),
      Status: r.status,
      Approval: r.approvalStatus,
      "Approved By": r.approvedByUser?.name || "—",
      Time: formatTime(r.date),
    }));
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Attendance");
    writeFile(workbook, `Group_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.text("Group Attendance Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    const tableData = filtered.map((r) => [
      r.user?.name || "—",
      r.user?.group ? `G${r.user.group}` : "—",
      r.areaName || "—",
      formatDate(r.date),
      r.status,
      r.approvalStatus,
      r.approvedByUser?.name || "—",
      formatTime(r.date),
    ]);
    autoTable(doc, {
      head: [["Name", t("group"), "Area", "Date", t("status"), "Approval", "Approved By", "Time"]],
      body: tableData,
      startY: 30,
    });
    doc.save(`Group_Attendance_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loading) return <Spinner label={t("loading")} progress={progress} showPercentage />;

  return (
    <div>
      <PageHeader
        title="Group Reports"
        description={isIncharge ? `Monitoring Group ${currentUser?.group}` : ""}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label={t("members")} value={stats.totalMembers} accent="brand" />
        <StatCard label={t("present")} value={stats.present} accent="green" />
        <StatCard label={t("pv_vardi")} value={stats.pv} accent="amber" />
        <StatCard label={t("absent")} value={stats.absent} accent="rose" />
        <StatCard label={t("pending")} value={stats.pendingCount} accent="slate" />
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t("from_date")}</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
              value={pendingFilters.start}
              onChange={(e) => setPendingFilters({ ...pendingFilters, start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t("to_date")}</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
              value={pendingFilters.end}
              onChange={(e) => setPendingFilters({ ...pendingFilters, end: e.target.value })}
            />
          </div>
          <div>
            <Select
              label={t("status")}
              value={pendingFilters.status}
              onChange={(e) => setPendingFilters({ ...pendingFilters, status: e.target.value as any })}
              options={[
                { value: "ALL", label: t("all_status") },
                { value: "P", label: t("present") },
                { value: "PV", label: t("pv_vardi") },
              ]}
              className="!py-2.5"
            />
          </div>
          <div>
            <MemberSearchSelect
              label={t("member")}
              value={pendingFilters.member}
              onChange={(userId) => setPendingFilters({ ...pendingFilters, member: userId })}
              members={users.filter(u => u.name).map(u => ({
                id: u.id,
                name: u.name,
              }))}
              allLabel={t("all_members")}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-end justify-between gap-6">
          <div className="w-full lg:w-1/3">
            <Select
              label={t("group")}
              value={pendingFilters.group}
              onChange={(e) => setPendingFilters({ ...pendingFilters, group: e.target.value })}
              options={isIncharge && currentUser?.group ? [
                { value: String(currentUser.group), label: `${t("group")} ${currentUser.group}` }
              ] : [
                { value: "ALL", label: t("all_groups") },
                ...[1, 2, 3, 4, 5, 6, 7, 8].map((g) => ({
                  value: String(g),
                  label: `${t("group")} ${g}`,
                })),
              ]}
              disabled={isIncharge}
              className="!py-2.5"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button onClick={handleApplyFilter} disabled={loading} className="flex-1 sm:flex-none px-8 h-[45px] shadow-sm shadow-brand-200">
              {loading ? t("loading") : t("apply_filter")}
            </Button>
            <Button variant="secondary" onClick={handleResetFilter} disabled={loading} className="flex-1 sm:flex-none px-8 h-[45px]">
              {t("reset")}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Attendance records ({filtered.length})
            </h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center justify-center p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                title="Download report"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {showDownloadMenu && (
                <div className="absolute left-0 mt-2 w-32 rounded-xl bg-white border border-slate-200 shadow-xl z-10 py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
                  <button onClick={() => { downloadPDF(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">PDF</button>
                  <button onClick={() => { downloadExcel(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">Excel</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {(["all", "approved", "pending"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={["rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition shadow-sm", filter === f ? "bg-brand-500 text-white shadow-brand-200" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"].join(" ")}>
                {t(f)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title={t("no_records")} />
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="py-4 px-6 font-semibold text-slate-700">Name</th>
                  <th className="py-4 px-4 font-semibold text-slate-700">{t("group")}</th>
                  <th className="py-4 px-4 font-semibold text-slate-700">Area</th>
                  <th className="py-4 px-4 font-semibold text-slate-700">Date</th>
                  <th className="py-4 px-4 font-semibold text-center text-slate-700">{t("status")}</th>
                  <th className="py-4 px-4 font-semibold text-center text-slate-700">Approval</th>
                  <th className="py-4 px-4 font-semibold text-slate-700">Approved By</th>
                  <th className="py-4 px-6 font-semibold text-right text-slate-700">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span>{row.user?.name ?? "—"}</span>
                        {row.user?.sewas?.[0]?.slot && (
                          <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                            {row.user.sewas[0].slot}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {row.user?.group ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {t("group")} {row.user.group}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-[200px] truncate">{row.areaName || "—"}</td>
                    <td className="py-4 px-4 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="py-4 px-4 text-center"><Badge status={row.status} /></td>
                    <td className="py-4 px-4 text-center"><ApprovalBadge status={row.approvalStatus} /></td>
                    <td className="py-4 px-4 text-slate-600">{row.approvedByUser?.name || "—"}</td>
                    <td className="py-4 px-6 text-right text-slate-500 tabular-nums font-medium">{formatTime(row.date)}</td>
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
