import type { Prisma } from "@prisma/client";

/** Records that count in dashboards and percentages. */
export const countsTowardStatsWhere: Prisma.AttendanceWhereInput = {
  approvalStatus: "APPROVED",
};

export const pendingPvWhere: Prisma.AttendanceWhereInput = {
  approvalStatus: "PENDING",
  status: "PV",
};

/** Fix member PV rows incorrectly stored as approved without admin action. */
export async function repairIncorrectPvApprovals(prisma: {
  attendance: {
    updateMany: (args: {
      where: Prisma.AttendanceWhereInput;
      data: { approvalStatus: "PENDING"; approvedBy: null; approvedAt: null };
    }) => Promise<{ count: number }>;
  };
}) {
  await prisma.attendance.updateMany({
    where: {
      status: "PV",
      approvalStatus: "APPROVED",
      markedBy: { not: "ADMIN" },
      approvedBy: null,
    },
    data: {
      approvalStatus: "PENDING",
      approvedBy: null,
      approvedAt: null,
    },
  });
}
