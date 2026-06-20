import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req);
  if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action, rejectionNote } = await req.json();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const record = await prisma.attendance.findUnique({ where: { id } });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  if (record.approvalStatus !== "PENDING") {
    return NextResponse.json(
      { error: "This request is no longer pending" },
      { status: 400 }
    );
  }

  const adminId = auth.userId;

  if (action === "approve") {
    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        approvalStatus: "APPROVED",
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionNote: null,
      },
      include: {
        user: { select: { name: true, username: true, email: true } },
      },
    });
    return NextResponse.json({ success: true, attendance });
  }

  const attendance = await prisma.attendance.update({
    where: { id },
    data: {
      approvalStatus: "REJECTED",
      approvedBy: adminId,
      approvedAt: new Date(),
      rejectionNote: rejectionNote || "Rejected by admin",
    },
    include: {
      user: { select: { name: true, username: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, attendance });
}
