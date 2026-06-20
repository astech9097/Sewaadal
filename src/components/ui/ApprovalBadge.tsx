import type { ApprovalStatus } from "@/types";

const styles: Record<ApprovalStatus, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const labels: Record<ApprovalStatus, string> = {
  APPROVED: "Approved",
  PENDING: "Pending approval",
  REJECTED: "Rejected",
};

export default function ApprovalBadge({
  status,
  alwaysShow,
}: {
  status: ApprovalStatus;
  alwaysShow?: boolean;
}) {
  if (status === "APPROVED" && !alwaysShow) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        Approved
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[status],
      ].join(" ")}
    >
      {labels[status]}
    </span>
  );
}
