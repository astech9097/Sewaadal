import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const updated = await prisma.user.updateMany({
      where: {},
      data: { mustChangePassword: false }
    });

    return NextResponse.json({
      success: true,
      message: "Disabled mustChangePassword for all users",
      count: updated.count
    });
  } catch (error) {
    console.error("Error disabling mustChangePassword:", error);
    return NextResponse.json(
      { success: false, message: "Error disabling mustChangePassword", error: String(error) },
      { status: 500 }
    );
  }
}
