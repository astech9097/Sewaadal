import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids, action, rejectionNote } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Select at least one pending request" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const pending = await prisma.attendance.findMany({
      where: {
        id: { in: ids },
        approvalStatus: "PENDING",
        status: "PV",
      },
    });

    if (pending.length === 0) {
      return NextResponse.json(
        { error: "No valid pending PV records selected" },
        { status: 400 }
      );
    }

    const adminId = auth.userId;
    const now = new Date();

    if (action === "approve") {
      await prisma.attendance.updateMany({
        where: { id: { in: pending.map((p) => p.id) } },
        data: {
          approvalStatus: "APPROVED",
          approvedBy: adminId,
          approvedAt: now,
          rejectionNote: null,
        },
      });
    } else {
      await prisma.attendance.updateMany({
        where: { id: { in: pending.map((p) => p.id) } },
        data: {
          approvalStatus: "REJECTED",
          approvedBy: adminId,
          approvedAt: now,
          rejectionNote: rejectionNote || "Rejected by admin (bulk)",
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: pending.length,
      message:
        action === "approve"
          ? `${pending.length} PV request(s) approved.`
          : `${pending.length} PV request(s) rejected.`,
    });
  } catch (err) {
    console.error("Bulk attendance error:", err);
    return NextResponse.json(
      { error: "Bulk action failed" },
      { status: 500 }
    );
  }
}
