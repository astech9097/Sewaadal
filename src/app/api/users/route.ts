import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAuthContext } from "@/lib/session";
import {
  normalizeUsername,
  validateMemberUsername,
} from "@/lib/username";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN" && auth.role !== "INCHARGE")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let where: any = {};
  
  if (auth.role === "SUPERADMIN") {
    where = {};
  } else if (auth.role === "ADMIN") {
    where = {
      OR: [{ role: Role.MEMBER }, { role: Role.INCHARGE }, { id: auth.userId }],
    };
  } else if (auth.role === "INCHARGE") {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { groups: true }
    });
    where = {
      groups: { hasSome: user?.groups ?? [] },
      role: { in: [Role.MEMBER, Role.INCHARGE] }
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      phone: true,
      groups: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, username, email, password, phone, role, groups } = await req.json();
  
  // Validate and determine role
  let userRole: Role = Role.MEMBER;
  if (role === "ADMIN" && auth.role === "SUPERADMIN") {
    userRole = Role.ADMIN;
  } else if (role === "INCHARGE") {
    userRole = Role.INCHARGE;
  }

  if (!name?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: "Name and password are required" },
      { status: 400 }
    );
  }

  if (userRole === "MEMBER" || userRole === "INCHARGE") {
    const usernameError = validateMemberUsername(String(username ?? ""));
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json(
        { error: `Mobile number is required for ${userRole.toLowerCase()} accounts (OTP password reset)` },
        { status: 400 }
      );
    }
  } else if (userRole === "ADMIN") {
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required for admin accounts" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        password: password.trim(), // Plain text password
        role: userRole,
        mustChangePassword: false,
        username:
          userRole === "MEMBER" || userRole === "INCHARGE"
            ? normalizeUsername(String(username))
            : null,
        email:
          userRole === "ADMIN"
            ? String(email).trim().toLowerCase()
            : null,
        phone: phone?.trim() || null,
        groups: Array.isArray(groups) ? groups.map(g => parseInt(String(g), 10)).filter(g => !isNaN(g)) : [],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        phone: true,
        groups: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("User POST error:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          {
            error:
              userRole === "MEMBER" || userRole === "INCHARGE"
                ? "Username already exists"
                : "Email already exists",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
