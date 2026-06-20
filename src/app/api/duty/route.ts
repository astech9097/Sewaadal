import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import {
  resolveSewasForMonth,
  hasAnySewaAssigned,
  SEWA_SLOTS,
  formatDutyLabel,
  parseSewaSlot,
} from "@/lib/dutySchedule";
import { getCurrentMonthLabel } from "@/utils/formatDate";

const sewaSelect = {
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
} as const;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");
    const monthParam = searchParams.get("month");

    let userId = auth.userId;
    if (requestedUserId) {
      if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = requestedUserId;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const referenceDate = monthParam ? new Date(`${monthParam}-01`) : new Date();
    if (Number.isNaN(referenceDate.getTime())) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...sewaSelect,
        group: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const schedule = resolveSewasForMonth(user, referenceDate);
    const patterns = SEWA_SLOTS.map((slot) => {
      const parsed = parseSewaSlot(user[slot.weekField], user[slot.dayField]);
      return {
        slotKey: slot.key,
        slotLabel: slot.label,
        weekOfMonth: parsed.weekOfMonth,
        dayOfWeek: parsed.dayOfWeek,
        label:
          parsed.weekOfMonth != null && parsed.dayOfWeek != null
            ? formatDutyLabel(parsed.weekOfMonth, parsed.dayOfWeek)
            : null,
      };
    }).filter((p) => p.label);

    return NextResponse.json({
      monthLabel: getCurrentMonthLabel(referenceDate),
      hasSewa: hasAnySewaAssigned(user),
      patterns,
      schedule,
    });
  } catch (err) {
    console.error("Duty GET error:", err);
    return NextResponse.json(
      { error: "Failed to load duty schedule" },
      { status: 500 }
    );
  }
}
