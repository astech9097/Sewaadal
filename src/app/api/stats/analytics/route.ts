import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and superadmins can access analytics
    if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Get total members
    const totalMembers = await prisma.user.count({
      where: { role: "MEMBER" },
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        approvalStatus: "APPROVED",
      },
      _count: {
        status: true,
      },
    });

    const presentToday = todayAttendance.find(a => a.status === "P" || a.status === "PV")?._count.status || 0;
    const absentToday = todayAttendance.find(a => a.status === "A")?._count.status || 0;

    // Get monthly attendance stats
    const monthlyAttendance = await prisma.attendance.count({
      where: {
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        approvalStatus: "APPROVED",
        OR: [{ status: "P" }, { status: "PV" }],
      },
    });

    // Calculate average attendance rate
    const totalPossibleAttendance = totalMembers * 4; // Assuming 4 weeks per month
    const averageAttendanceRate = totalPossibleAttendance > 0 
      ? (monthlyAttendance / totalPossibleAttendance) * 100 
      : 0;

    // Get pending approvals count
    const pendingApprovals = await prisma.attendance.count({
      where: {
        approvalStatus: "PENDING",
      },
    });

    // Get attendance trend for last 6 months
    const attendanceTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const present = await prisma.attendance.count({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
          approvalStatus: "APPROVED",
          OR: [{ status: "P" }, { status: "PV" }],
        },
      });

      const absent = await prisma.attendance.count({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
          approvalStatus: "APPROVED",
          status: "A",
        },
      });

      attendanceTrend.push({
        month: format(monthDate, "MMM yyyy"),
        present,
        absent,
      });
    }

    // Get group-wise stats
    const groupWiseStats = [];
    for (let group = 1; group <= 5; group++) {
      const groupMembers = await prisma.user.count({
        where: {
          role: "MEMBER",
          group,
        },
      });

      if (groupMembers === 0) continue;

      const groupPresent = await prisma.attendance.count({
        where: {
          user: {
            group,
          },
          date: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
          approvalStatus: "APPROVED",
          OR: [{ status: "P" }, { status: "PV" }],
        },
      });

      groupWiseStats.push({
        group,
        present: groupPresent,
        total: groupMembers * 4, // Assuming 4 weeks
      });
    }

    // Get top attendees
    const topAttendeesData = await prisma.user.findMany({
      where: {
        role: "MEMBER",
      },
      select: {
        id: true,
        name: true,
        group: true,
        attendance: {
          where: {
            date: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
            approvalStatus: "APPROVED",
            OR: [{ status: "P" }, { status: "PV" }],
          },
        },
      },
      take: 10,
    });

    const topAttendees = topAttendeesData
      .map((user) => ({
        name: user.name,
        group: user.group || 0,
        attendance: user.attendance.length,
      }))
      .sort((a, b) => b.attendance - a.attendance)
      .slice(0, 5);

    return NextResponse.json({
      totalMembers,
      totalAttendanceThisMonth: monthlyAttendance,
      averageAttendanceRate: Math.round(averageAttendanceRate),
      pendingApprovals,
      presentToday,
      absentToday,
      memberGrowth: [], // Can be implemented with historical data
      attendanceTrend,
      groupWiseStats,
      topAttendees,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
