import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find APPROVED records with photoUrl older than 90 days
    const recordsToClean = await prisma.attendance.findMany({
      where: {
        approvalStatus: "APPROVED",
        photoUrl: { not: null },
        date: { lt: ninetyDaysAgo },
      },
      select: { id: true, photoUrl: true },
    });

    if (recordsToClean.length === 0) {
      return NextResponse.json({ message: "No records to clean" });
    }

    // Update records to remove photoUrl
    const result = await prisma.attendance.updateMany({
      where: {
        id: { in: recordsToClean.map((r) => r.id) },
      },
      data: {
        photoUrl: null,
      },
    });

    // NOTE: In a real-world scenario, you would also delete the actual files from 
    // your storage provider (e.g., S3, Cloudinary, Uploadthing) using recordsToClean.
    // For now, we are just clearing the reference in the database.

    return NextResponse.json({
      message: `Successfully cleaned ${result.count} records`,
      count: result.count,
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
