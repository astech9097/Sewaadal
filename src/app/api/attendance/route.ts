import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveMemberLocation,
  describeMemberLocationFailure,
} from "@/lib/approvedSites";
import { getAuthContext } from "@/lib/session";
import { repairIncorrectPvApprovals } from "@/lib/attendanceQuery";
import { buildAttendanceDate, getDayBounds } from "@/utils/formatDate";
import type { ApprovalStatus, AttendanceStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const group = searchParams.get("group");
  const status = searchParams.get("status");
  const pendingOnly = searchParams.get("pending") === "true";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const { role, userId: sessionUserId } = auth;

  // Get current user's group for INCHARGE restriction
  let userGroups: number[] = [];
  if (role === "INCHARGE") {
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { groups: true }
    });
    userGroups = user?.groups ?? [];
  }

  if (pendingOnly && role !== "ADMIN" && role !== "SUPERADMIN" && role !== "INCHARGE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let dateFilter: any = {};
  if (startDate || endDate) {
    try {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if ((start && !isNaN(start.getTime())) || (end && !isNaN(end.getTime()))) {
        dateFilter = {
          date: {
            ...(start && !isNaN(start.getTime()) ? { gte: start } : {}),
            ...(end && !isNaN(end.getTime()) ? { lte: end } : {}),
          },
        };
      }
    } catch (e) {
      console.error("Date filter parsing error:", e);
    }
  }

  const baseWhere =
    role === "ADMIN" || role === "SUPERADMIN"
      ? {
          ...(userId ? { userId } : {}),
          ...(status ? { status: status as AttendanceStatus } : {}),
          ...(group ? { user: { groups: { has: parseInt(group, 10) } } } : {}),
          ...dateFilter,
        }
      : role === "INCHARGE"
      ? {
          user: { groups: { hasSome: userGroups } }, // Only their group
          ...(userId ? { userId } : {}),
          ...(status ? { status: status as AttendanceStatus } : {}),
          ...dateFilter,
        }
      : {
          userId: sessionUserId,
          ...(status ? { status: status as AttendanceStatus } : {}),
          ...dateFilter,
        };

  if (pendingOnly && (role === "ADMIN" || role === "SUPERADMIN" || role === "INCHARGE")) {
    await repairIncorrectPvApprovals(prisma);
  }

  const where = pendingOnly
    ? {
        ...baseWhere,
        approvalStatus: "PENDING" as ApprovalStatus,
        status: { in: ["P", "PV"] as AttendanceStatus[] },
      }
    : baseWhere;

  const attendance = await prisma.attendance.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          groups: true,
          firstSewaWeek: true,
          firstSewaDay: true,
          secondSewaWeek: true,
          secondSewaDay: true,
          thirdSewaWeek: true,
          thirdSewaDay: true,
          extraSewa1Week: true,
          extraSewa1Day: true,
          extraSewa2Week: true,
          extraSewa2Day: true,
        },
      },
      approvedByUser: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 5000,
  });

  console.log(`[API] Found ${attendance.length} attendance records for query:`, JSON.stringify(where));

  // Map the Prisma results to the format the frontend expects (adding the virtual 'sewas' array)
  const results = attendance.map((att) => {
    const sewas = [];
    if (att.user) {
      if (att.user.firstSewaWeek !== null) sewas.push({ slot: "FIRST" });
      if (att.user.secondSewaWeek !== null) sewas.push({ slot: "SECOND" });
      if (att.user.thirdSewaWeek !== null) sewas.push({ slot: "THIRD" });
      if (att.user.extraSewa1Week !== null) sewas.push({ slot: "EXTRA1" });
      if (att.user.extraSewa2Week !== null) sewas.push({ slot: "EXTRA2" });
    }

    return {
      ...att,
      user: att.user ? {
        ...att.user,
        sewas,
      } : { 
        id: att.userId, 
        name: "Unknown Member", 
        username: att.userId, 
        groups: [],
        sewas: [] 
      },
    };
  });

  return NextResponse.json(results);
  } catch (err) {
    console.error("Attendance GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load attendance" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId,
      status,
      photoUrl,
      latitude,
      longitude,
      accuracy,
      date: dateInput,
      time: timeInput,
    } = body as {
      userId?: string;
      status: AttendanceStatus;
      photoUrl?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      date?: string;
      time?: string;
    };

    const { role, userId: sessionUserId } = auth;
    const targetUserId =
      role === "ADMIN" || role === "SUPERADMIN" ? userId : sessionUserId;

    if (!status || !["P", "PV", "A"].includes(status)) {
      return NextResponse.json(
        { error: "Valid attendance status (P, PV, or A) is required" },
        { status: 400 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            role === "ADMIN" || role === "SUPERADMIN"
              ? "Please select a member"
              : "Session expired. Please sign in again.",
        },
        { status: 400 }
      );
    }

    const attendanceDate =
      (role === "ADMIN" || role === "SUPERADMIN") && dateInput
        ? buildAttendanceDate(dateInput, timeInput)
        : new Date();

    const { start: dayStart, end: dayEnd } = getDayBounds(attendanceDate);

    if (role === "MEMBER" || role === "INCHARGE") {
      const existing = await prisma.attendance.findFirst({
        where: {
          userId: targetUserId,
          date: { gte: dayStart, lt: dayEnd },
          approvalStatus: { in: ["APPROVED", "PENDING"] },
        },
      });

      if (existing) {
        const msg =
          existing.approvalStatus === "PENDING"
            ? "You already have a PV request pending admin approval for this day."
            : "Attendance already marked for today.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      if (status === "PV") {
        if (latitude == null || longitude == null) {
          return NextResponse.json(
            { error: "Location is required. Enable GPS to mark PV attendance." },
            { status: 400 }
          );
        }

        const accuracyMeters =
          typeof accuracy === "number" && Number.isFinite(accuracy)
            ? accuracy
            : null;

        const matched = await resolveMemberLocation(
          latitude,
          longitude,
          accuracyMeters
        );

        if (!matched) {
          const failure = await describeMemberLocationFailure(
            latitude,
            longitude,
            accuracyMeters
          );
          return NextResponse.json(failure, { status: 403 });
        }

        const areaName = matched.name;

        if (!photoUrl) {
          return NextResponse.json(
            { error: "Live selfie photo is required for PV attendance." },
            { status: 400 }
          );
        }

        const attendance = await prisma.attendance.create({
          data: {
            userId: targetUserId,
            status: "PV",
            date: attendanceDate,
            photoUrl,
            latitude,
            longitude,
            areaName,
            markedBy: sessionUserId,
            approvalStatus: "PENDING",
            approvedBy: null,
            approvedAt: null,
          },
          include: { user: { select: { name: true } } },
        });

        return NextResponse.json({
          success: true,
          pending: true,
          areaName,
          message: `PV submitted from ${areaName}. Waiting for admin approval.`,
          attendance,
        });
      }

      // Normal P (Present) or A (Absent)
      const isAutoApproved = status === "P" || status === "A";
      const attendance = await prisma.attendance.create({
        data: {
          userId: targetUserId,
          status,
          date: attendanceDate,
          photoUrl: null,
          latitude: null,
          longitude: null,
          areaName: "Self Marked",
          markedBy: sessionUserId,
          approvalStatus: isAutoApproved ? "APPROVED" : "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        pending: !isAutoApproved,
        areaName: "Self Marked",
        message: isAutoApproved
          ? "Attendance marked successfully."
          : "Attendance submitted. Waiting for admin approval.",
        attendance,
      });
    }

    // Admin: mark from anywhere, any date/time; upsert for that calendar day
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: targetUserId,
        date: { gte: dayStart, lt: dayEnd },
      },
    });

    const data = {
      userId: targetUserId,
      status,
      date: attendanceDate,
      photoUrl: photoUrl || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      markedBy: "ADMIN",
      approvalStatus: "APPROVED" as ApprovalStatus,
      approvedBy: sessionUserId!,
      approvedAt: new Date(),
      rejectionNote: null,
    };

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data,
          include: { user: { select: { name: true } } },
        })
      : await prisma.attendance.create({
          data,
          include: { user: { select: { name: true } } },
        });

    return NextResponse.json({ success: true, attendance });
  } catch (err: any) {
    console.error("Attendance POST error:", err);
    return NextResponse.json(
      { 
        error: "Server error while saving attendance. Try again.",
        details: err.message || String(err),
        code: err.code || "UNKNOWN"
      },
      { status: 500 }
    );
  }
}
