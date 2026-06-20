import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveSewasForMonth } from "@/lib/dutySchedule";
import { sendPhoneNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        role: "MEMBER",
        phone: { not: null },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        group: true,
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
    });

    let reminderCount = 0;

    for (const user of users) {
      const schedule = resolveSewasForMonth(user, tomorrow);
      const tomorrowDuty = schedule.find(item => {
        const itemDate = new Date(item.date);
        return itemDate.toDateString() === tomorrow.toDateString();
      });

      if (tomorrowDuty) {
        console.log(`[DutyReminder] Sending reminder to ${user.name} (${user.phone}) for duty on ${tomorrowDuty.dateLabel}`);
        
        const message = `Jai Satnam ${user.name}, you have duty tomorrow (${tomorrowDuty.dateLabel}) at ${tomorrowDuty.slotLabel}.`;
        
        await sendPhoneNotification(user.phone!, message).catch(err => {
          console.error(`[DutyReminder] Notification failed for ${user.name}:`, err);
        });

        reminderCount++;
      }
    }

    return NextResponse.json({ 
      message: `Checked ${users.length} users, sent ${reminderCount} reminders for tomorrow.`,
      reminderCount 
    });
  } catch (err) {
    console.error("Duty Reminder Cron error:", err);
    return NextResponse.json({ error: "Failed to process duty reminders" }, { status: 500 });
  }
}
