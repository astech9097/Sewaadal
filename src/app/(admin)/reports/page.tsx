"use client";

import { useEffect, useState, useRef } from "react";
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
    groups?: number[];
    sewas?: { slot: string }[];
  };
  approvedByUser?: { name: string };
};

type UserOption = {
  id: string;
  name: string;
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as { role?: string; groups?: number[] } | undefined;
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  
  // New specific filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "P" | "PV">("ALL");
  const [memberFilter, setMemberFilter] = useState<string>("ALL");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");

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
      // Robust date parsing
      const startParts = filters.start.split("-").map(Number);
      const endParts = filters.end.split("-").map(Number);
      
      if (startParts.length !== 3 || endParts.length !== 3) {
        throw new Error("Invalid date format");
      }

      const start = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);

      // Add a small buffer to the end date to handle timezone shifts
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

      console.log("[Reports] Params:", params.toString());
      console.log("[Reports] Attendance Response:", attRes);

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
    if (isIncharge && currentUser?.groups && currentUser.groups.length > 0) {
      const g = String(currentUser.groups[0]);
      const newFilters = { ...pendingFilters, group: g };
      setPendingFilters(newFilters);
      setAppliedFilters(newFilters);
      loadData(newFilters);
    } else {
      loadData();
    }
  }, [isIncharge, currentUser?.groups]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
      if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node)) {
        setShowFilterModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleApplyFilter = () => {
    setAppliedFilters(pendingFilters);
    loadData(pendingFilters);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData(appliedFilters);
      } else {
        alert("Failed to delete record");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete record");
    }
  };

  const handleResetFilter = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const reset = {
      start: startOfMonth.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      status: "ALL" as const,
      member: "ALL",
      group: "ALL",
    };
    setPendingFilters(reset);
    setAppliedFilters(reset);
    loadData(reset);
  };

  const filtered = (records || []).filter((r) => {
    if (!r) return false;

    // Filter by Approval (Tabs)
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
      Groups: r.user?.groups && r.user.groups.length > 0 ? r.user.groups.map(g => `${t("group")} ${g}`).join(", ") : "—",
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
    writeFile(workbook, `Sewadal_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.text("Sewadal Attendance Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = filtered.map((r) => [
      r.user?.name || "—",
      r.user?.groups && r.user.groups.length > 0 ? r.user.groups.map(g => `G${g}`).join(", ") : "—",
      r.areaName || "—",
      formatDate(r.date),
      r.status,
      r.approvalStatus,
      r.approvedByUser?.name || "—",
      formatTime(r.date),
    ]);

    autoTable(doc, {
      head: [["Name", t("groups"), "Area", "Date", t("status"), "Approval", "Approved By", "Time"]],
      body: tableData,
      startY: 30,
    });

    doc.save(`Sewadal_Attendance_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loading) return <Spinner label={t("loading")} progress={progress} showPercentage />;

  return (
    <div>
      <PageHeader
        title={t("reports")}
        description=""
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label={t("members")} value={stats.totalMembers} accent="brand" />
        <StatCard label={t("present")} value={stats.present} accent="green" />
        <StatCard label={t("pv_vardi")} value={stats.pv} accent="amber" />
        <StatCard label={t("absent")} value={stats.absent} accent="rose" />
        <StatCard label={t("pending")} value={stats.pendingCount} accent="slate" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Attendance records ({filtered.length})
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {(["all", "approved", "pending"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={[
                    "rounded-lg px-3 py-1 text-xs font-semibold capitalize transition shadow-sm",
                    filter === f
                      ? "bg-brand-500 text-white shadow-brand-200"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {t(f)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <div className="relative" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                  title="Download report"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white border border-slate-200 shadow-xl z-10 py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
                    <button
                      onClick={() => {
                        downloadPDF();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        downloadExcel();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      Excel
                    </button>
                  </div>
                )}
              </div>
              <div className="relative" ref={filterModalRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(!showFilterModal)}
                  className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                  title="Filter reports"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
                {showFilterModal && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-10 p-4 overflow-hidden animate-in fade-in zoom-in duration-100" style={{ maxWidth: "calc(100vw - 32px)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t("from_date")}</label>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
                          value={pendingFilters.start}
                          onChange={(e) => setPendingFilters({ ...pendingFilters, start: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t("to_date")}</label>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
                          value={pendingFilters.end}
                          onChange={(e) => setPendingFilters({ ...pendingFilters, end: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <Select
                        label={t("status")}
                        value={pendingFilters.status}
                        onChange={(e) => setPendingFilters({ ...pendingFilters, status: e.target.value as any })}
                        options={[
                          { value: "ALL", label: t("all_status") },
                          { value: "P", label: t("present") },
                          { value: "PV", label: t("pv_vardi") },
                        ]}
                        className="!py-2"
                      />
                    </div>
                    <div className="mb-3">
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
                    <div className="mb-4">
                      <Select
                        label={t("group")}
                        value={pendingFilters.group}
                        onChange={(e) => setPendingFilters({ ...pendingFilters, group: e.target.value })}
                        options={isIncharge && currentUser?.groups && currentUser.groups.length > 0 ? [
                          { value: String(currentUser.groups[0]), label: `${t("group")} ${currentUser.groups[0]}` }
                        ] : [
                          { value: "ALL", label: t("all_groups") },
                          ...[1, 2, 3, 4, 5, 6, 7, 8].map((g) => ({
                            value: String(g),
                            label: `${t("group")} ${g}`,
                          })),
                        ]}
                        disabled={isIncharge}
                        className="!py-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          handleApplyFilter();
                          setShowFilterModal(false);
                        }}
                        disabled={loading}
                        className="flex-1 px-4 h-[36px] shadow-sm shadow-brand-200"
                      >
                        {loading ? t("loading") : t("apply_filter")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          handleResetFilter();
                          setShowFilterModal(false);
                        }}
                        disabled={loading}
                        className="flex-1 px-4 h-[36px]"
                      >
                        {t("reset")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title={t("no_records")} />
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="py-3 px-4 font-semibold text-slate-700">Name</th>
                  <th className="py-3 px-3 font-semibold text-slate-700">{t("group")}</th>
                  <th className="py-3 px-3 font-semibold text-slate-700">Area</th>
                  <th className="py-3 px-3 font-semibold text-slate-700">Date</th>
                  <th className="py-3 px-3 font-semibold text-center text-slate-700">{t("status")}</th>
                  <th className="py-3 px-3 font-semibold text-center text-slate-700">Approval</th>
                  <th className="py-3 px-3 font-semibold text-slate-700">Approved By</th>
                  <th className="py-3 px-4 font-semibold text-right text-slate-700">Time</th>
                  <th className="py-3 px-4 font-semibold text-center text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span>{row.user?.name ?? "—"}</span>
                        {row.user?.sewas?.[0]?.slot && (
                          <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                            {row.user.sewas[0].slot}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {row.user?.groups && row.user.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.user.groups.map(g => (
                            <span key={g} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              {t("group")} {g}
                            </span>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">
                      {row.areaName || "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge status={row.status} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ApprovalBadge status={row.approvalStatus} />
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {row.approvedByUser?.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 tabular-nums font-medium">
                      {formatTime(row.date)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                        title="Delete record"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
