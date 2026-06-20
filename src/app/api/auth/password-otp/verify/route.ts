import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { otp, newPassword } = await req.json();

  if (!otp || !newPassword) {
    return NextResponse.json(
      { error: "OTP and new password are required" },
      { status: 400 }
    );
  }

  if (String(newPassword).length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const record = await prisma.passwordOtp.findFirst({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json(
      { error: "No OTP found. Request a new one." },
      { status: 400 }
    );
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordOtp.delete({ where: { id: record.id } });
    return NextResponse.json(
      { error: "OTP expired. Request a new one." },
      { status: 400 }
    );
  }

  const valid = await verifyOtp(String(otp).trim(), record.codeHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: auth.userId },
      data: { password: hashedPassword, mustChangePassword: false },
    }),
    prisma.passwordOtp.deleteMany({ where: { userId: auth.userId } }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Password updated successfully. Use your new password next time you sign in.",
  });
}
