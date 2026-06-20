import type { AttendanceStatus } from "@/types";

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Present",
  PV: "Present (Vardi)",
  A: "Absent",
};

export const STATUS_SHORT: Record<AttendanceStatus, string> = {
  P: "P",
  PV: "PV",
  A: "A",
};

export function statusBadgeClass(status: AttendanceStatus): string {
  switch (status) {
    case "P":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "PV":
      return "bg-amber-50 text-amber-800 ring-amber-600/20";
    case "A":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-500/20";
  }
}
