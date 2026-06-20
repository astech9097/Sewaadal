import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import {
  sewaFormFromUser,
  sewaUpdateFromForm,
  type SewaFormState,
} from "@/lib/dutySchedule";
import {
  normalizeUsername,
  validateMemberUsername,
} from "@/lib/username";

type RouteParams = { params: Promise<{ id: string }> };
type ManagedRole = Role;

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

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(req);
    const { id } = await params;

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Members can only view their own profile
    if (auth.role === "MEMBER" && auth.userId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        group: true,
        createdAt: true,
        ...sewaSelect,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (
      auth.role === "ADMIN" &&
      user.role !== "MEMBER" &&
      user.role !== "INCHARGE" &&
      user.id !== auth.userId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      ...user,
      sewas: sewaFormFromUser(user),
    });
  } catch (err) {
    console.error("User GET error:", err);
    return NextResponse.json({ error: "Failed to load member" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(req);
    const { id } = await params;

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Members and Incharges can only update their own profile
    if ((auth.role === "MEMBER" || auth.role === "INCHARGE") && auth.userId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, username, email, phone, password, role, sewas, group } = body as {
      name?: string;
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: ManagedRole;
      sewas?: SewaFormState;
      group?: number | null;
    };

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Role-based restrictions
    if (auth.role === "MEMBER" || auth.role === "INCHARGE") {
      if (role !== undefined && role !== existing.role) {
        return NextResponse.json({ error: "Cannot change role" }, { status: 403 });
      }
      if (username !== undefined && username !== existing.username) {
        return NextResponse.json({ error: "Cannot change username" }, { status: 403 });
      }
      if (sewas !== undefined) {
        return NextResponse.json({ error: "Members cannot change their sewa schedule" }, { status: 403 });
      }
    }

    if (
      (auth.role === "ADMIN") &&
      existing.role !== "MEMBER" &&
      existing.role !== "INCHARGE" &&
      existing.id !== auth.userId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nextRole = (role || existing.role) as Role;

    if (auth.role === "ADMIN" && role && role !== existing.role) {
      // Allow ADMIN to change role only if it's MEMBER -> INCHARGE or vice versa
      const allowedTransition = 
        (existing.role === Role.MEMBER && role === Role.INCHARGE) ||
        (existing.role === Role.INCHARGE && role === Role.MEMBER);

      if (!allowedTransition) {
        return NextResponse.json(
          { error: "Admins can only promote members to Incharge or demote back to Member." },
          { status: 403 }
        );
      }
    }

    if ((nextRole === "MEMBER" || nextRole === "INCHARGE") && phone !== undefined && !String(phone).trim()) {
      return NextResponse.json(
        { error: "Mobile number is required for members and incharges" },
        { status: 400 }
      );
    }

    if (
      username !== undefined &&
      (nextRole === "MEMBER" || nextRole === "SUPERADMIN" || nextRole === "INCHARGE")
    ) {
      const normalized = normalizeUsername(username);
      if (normalized !== existing.username) {
        const usernameError = validateMemberUsername(normalized);
        if (usernameError) {
          return NextResponse.json({ error: usernameError }, { status: 400 });
        }
        // Explicitly check if another user has this username
        const conflict = await prisma.user.findFirst({
          where: { username: normalized, id: { not: id } }
        });
        if (conflict) {
          return NextResponse.json({ error: "Username already in use by another user." }, { status: 400 });
        }
      }
    }

    if (email !== undefined && nextRole === "ADMIN") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return NextResponse.json(
          { error: "Valid email is required for admin" },
          { status: 400 }
        );
      }
      if (normalizedEmail !== existing.email) {
        const conflict = await prisma.user.findFirst({
          where: { email: normalizedEmail, id: { not: id } }
        });
        if (conflict) {
          return NextResponse.json({ error: "Email already in use by another user." }, { status: 400 });
        }
      }
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name.trim();
    if (phone !== undefined) data.phone = phone.trim();
    if (group !== undefined) data.group = group ? parseInt(String(group), 10) : null;
    
    if (role !== undefined) {
      // Use the Role enum from Prisma to ensure type safety and correct runtime value
      let nextRoleValue: Role = existing.role;
      if (role === "SUPERADMIN") nextRoleValue = Role.SUPERADMIN;
      else if (role === "ADMIN") nextRoleValue = Role.ADMIN;
      else if (role === "INCHARGE") nextRoleValue = Role.INCHARGE;
      else if (role === "MEMBER") nextRoleValue = Role.MEMBER;
      
      data.role = nextRoleValue;
      
      if (nextRoleValue === Role.MEMBER || nextRoleValue === Role.SUPERADMIN || nextRoleValue === Role.INCHARGE) {
        // Keep existing email if any, or null it if converting from ADMIN
        if (existing.role === Role.ADMIN) data.email = null;
      } else if (nextRoleValue === Role.ADMIN) {
        // Keep existing username if any, or null it if converting from MEMBER
        if (existing.role === Role.MEMBER || existing.role === Role.INCHARGE) data.username = null;
      }
    }
    if (
      username !== undefined &&
      (nextRole === "MEMBER" || nextRole === "SUPERADMIN" || nextRole === "INCHARGE")
    ) {
      data.username = normalizeUsername(username);
      // Only nullify email if we are explicitly changing the login type
      if (existing.role === "ADMIN") data.email = null;
    }
    if (email !== undefined && nextRole === "ADMIN") {
      data.email = email.trim().toLowerCase();
      // Only nullify username if we are explicitly changing the login type
      if (existing.role === "MEMBER" || existing.role === "INCHARGE" || existing.role === "SUPERADMIN") {
        data.username = null;
      }
    }
    if (password?.trim()) {
    data.password = await bcrypt.hash(password.trim(), 10);
    data.mustChangePassword = false;
  }
    if (sewas !== undefined) {
      Object.assign(data, sewaUpdateFromForm(sewas));
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        ...sewaSelect,
      },
    });

    return NextResponse.json({
      success: true,
      user: { ...user, sewas: sewaFormFromUser(user) },
    });
  } catch (err) {
    console.error("User PATCH error:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "Username or email already in use." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update member." },
      { status: 500 }
    );
  }
}
