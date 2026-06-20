import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { generateOtp, hashOtp, OTP_EXPIRY_MINUTES } from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";
import { isValidIndianMobile, maskPhone, normalizePhone } from "@/lib/phone";

export async function POST() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, phone: true, name: true },
    });

    if (!user?.phone) {
      return NextResponse.json(
        {
          error:
            "No mobile number on your account. Ask admin to add your phone in Members.",
        },
        { status: 400 }
      );
    }

    if (!isValidIndianMobile(user.phone)) {
      return NextResponse.json(
        { error: "Invalid mobile number stored on your account." },
        { status: 400 }
      );
    }

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentCount = await prisma.passwordOtp.count({
      where: { userId: user.id, createdAt: { gte: fifteenMinAgo } },
    });

    if (recentCount >= 3) {
      return NextResponse.json(
        { error: "Too many OTP requests. Try again in 15 minutes." },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const codeHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordOtp.deleteMany({ where: { userId: user.id } });
    await prisma.passwordOtp.create({
      data: {
        userId: user.id,
        phone: normalizePhone(user.phone),
        codeHash,
        expiresAt,
      },
    });

    try {
      const result = await sendOtpSms(user.phone, otp);
      return NextResponse.json({
        success: true,
        maskedPhone: maskPhone(user.phone),
        message: result.sent
          ? `OTP sent to ${maskPhone(user.phone)}`
          : `OTP generated (dev mode). Check server console.`,
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      });
    } catch (smsErr) {
      await prisma.passwordOtp.deleteMany({ where: { userId: user.id } });
      return NextResponse.json(
        {
          error:
            smsErr instanceof Error ? smsErr.message : "Failed to send OTP",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json(
      { error: "Server error while sending OTP. Try again." },
      { status: 500 }
    );
  }
}
