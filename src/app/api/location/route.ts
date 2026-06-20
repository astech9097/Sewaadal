import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import {
  getActiveApprovedLocations,
  syncApprovedLocations,
} from "@/lib/approvedSites";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await getActiveApprovedLocations();
    return NextResponse.json({ locations });
  } catch (err) {
    console.error("Location GET error:", err);
    return NextResponse.json(
      { error: "Failed to load locations", locations: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, radius } = await req.json();

    if (!id || radius === undefined) {
      return NextResponse.json(
        { error: "Location id and radius are required" },
        { status: 400 }
      );
    }

    const location = await prisma.location.update({
      where: { id },
      data: { radius: parseFloat(String(radius)) },
    });

    return NextResponse.json({ success: true, location });
  } catch (err) {
    console.error("Location POST error:", err);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  try {
    const auth = await getAuthContext();
    if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncApprovedLocations();
    const locations = await getActiveApprovedLocations();
    return NextResponse.json({ success: true, locations });
  } catch (err) {
    console.error("Location PUT error:", err);
    return NextResponse.json(
      { error: "Failed to sync approved locations" },
      { status: 500 }
    );
  }
}
