import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

async function checkStoredPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const input = plain.trim();
  if (stored.startsWith("$2")) {
    return bcrypt.compare(input, stored);
  }
  return stored === input || stored.toLowerCase() === input.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oldPassword, newPassword, confirmPassword } = await req.json();

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Old password, new password, and confirmation are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    if (String(newPassword).trim().length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters" },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from old password" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User found:", { id: user.id, email: user.email, username: user.username });
    console.log("Stored password:", user.password);
    console.log("Old password entered:", oldPassword);

    // Verify old password (plain text check)
    const isValid = user.password === oldPassword || 
                   (user.password.startsWith("$2") && await bcrypt.compare(oldPassword, user.password));
    
    console.log("Password valid?", isValid);

    if (!isValid) {
      return NextResponse.json({ error: "Incorrect old password" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword, // Store as plain text
        mustChangePassword: user.role === "MEMBER" ? false : user.mustChangePassword,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Password updated. Use your new password the next time you sign in.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}
