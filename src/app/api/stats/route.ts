import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { countsTowardStatsWhere } from "@/lib/attendanceQuery";
import { calculateMemberMonthlyPercentage } from "@/utils/calculatePercentage";


export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, userId } = auth;
    const todayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const today = new Date(todayStr);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    if (role === "ADMIN" || role === "SUPERADMIN" || role === "INCHARGE") {
      // For INCHARGE, only count their group members
      let groupFilter: any = {};
      if (role === "INCHARGE") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { groups: true }
      });
      groupFilter = { groups: { hasSome: user?.groups ?? [] } };
    }

      const [totalMembers, todayRecords, recentAttendance, pendingCount] =
        await Promise.all([
          prisma.user.count({ 
            where: { 
              role: { in: ["MEMBER", "INCHARGE"] },
              ...groupFilter 
            } 
          }),
          prisma.attendance.findMany({
            where: {
              date: { gte: today, lt: tomorrow },
              ...countsTowardStatsWhere,
              user: groupFilter
            },
            select: { status: true },
          }),
          prisma.attendance.findMany({
            where: {
              ...countsTowardStatsWhere,
              user: groupFilter
            },
            take: 10,
            orderBy: { date: "desc" },
            select: {
              id: true,
              status: true,
              approvalStatus: true,
              date: true,
              user: { select: { name: true } },
            },
          }),
          prisma.attendance.count({
            where: {
              approvalStatus: "PENDING",
              status: { in: ["P", "PV"] },
              user: groupFilter
            },
          }),
        ]);

      const present = todayRecords.filter((r) => r.status === "P").length;
      const pv = todayRecords.filter((r) => r.status === "PV").length;
      const absent = todayRecords.filter((r) => r.status === "A").length;

      return NextResponse.json({
        totalMembers,
        pendingCount,
        today: { present, pv, absent, total: todayRecords.length },
        recentAttendance,
      });
    }



    const [records, pendingToday] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId,
          ...countsTowardStatsWhere,
          date: { gte: monthStart, lt: monthEnd },
        },
        orderBy: { date: "desc" },
        select: {
          id: true,
          status: true,
          date: true,
        },
      }),
      prisma.attendance.findFirst({
        where: {
          userId,
          approvalStatus: "PENDING",
          date: { gte: today, lt: tomorrow },
        },
        select: { id: true },
      }),
    ]);

    const present = records.filter((r) => r.status === "P").length;
    const pv = records.filter((r) => r.status === "PV").length;
    const absent = records.filter((r) => r.status === "A").length;
    const total = records.length;

    const monthly = calculateMemberMonthlyPercentage({
      present,
      presentVardi: pv,
      absent,
    }); // percentage uses PV count only

    const todayRecord = records.find((r) => {
      const d = new Date(r.date);
      return d >= today && d < tomorrow;
    });

    return NextResponse.json({
      percentage: monthly.percentage,
      percentageQualified: monthly.qualified,
      minPresentRequired: monthly.minRequired,
      minPvRequired: monthly.minRequired,
      monthPvTotal: monthly.pvTotal,
      monthPresentTotal: monthly.pvTotal,
      present,
      pv,
      absent,
      total,
      todayMarked: Boolean(todayRecord),
      todayStatus: todayRecord?.status ?? null,
      pendingToday: Boolean(pendingToday),
      recent: records.slice(0, 10),
    });
  } catch (err) {
    console.error("Stats GET error:", err);
    return NextResponse.json(
      { error: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
