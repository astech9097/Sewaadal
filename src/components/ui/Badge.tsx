import type { AttendanceStatus } from "@/types";
import { STATUS_SHORT, statusBadgeClass } from "@/lib/attendance";

interface BadgeProps {
  status: AttendanceStatus;
  className?: string;
}

export default function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        statusBadgeClass(status),
        className,
      ].join(" ")}
    >
      {STATUS_SHORT[status]}
    </span>
  );
}
