import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { prisma as globalPrisma } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { broadcastToAllMembers } from "@/lib/notifications";

// Helper to get a working prisma client
async function getPrisma() {
  const p = globalPrisma as any;
  // If global prisma has broadcast, use it
  if (p.broadcast) return globalPrisma;

  console.warn("[Broadcast API] Global prisma missing Broadcast model. Initializing fresh client...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const freshPrisma = new PrismaClient({ adapter });
  
  // Quick check on fresh client
  if (!(freshPrisma as any).broadcast) {
    console.error("[Broadcast API] Freshly initialized prisma also missing Broadcast model!");
  }
  
  return freshPrisma;
}

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma();
    const broadcasts = await (prisma as any).broadcast.findMany({
      where: {
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json(broadcasts);
  } catch (err) {
    console.error("Broadcast GET error:", err);
    return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let requestData = null;
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      console.log("[Broadcast] POST failed: No auth context");
      return NextResponse.json({ error: "Unauthorized: No session found" }, { status: 401 });
    }
    
    if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
      console.log("[Broadcast] POST failed: Invalid role", auth.role);
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    try {
      requestData = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, message, type, expiresAt } = requestData;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const p = prisma as any;

    // Verify creator exists
    const creator = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!creator) {
      console.error("[Broadcast] Creator not found in DB:", auth.userId);
      return NextResponse.json({ 
        error: "Session Error", 
        details: "Your user account was not found in the current database. Please sign out and sign in again." 
      }, { status: 401 });
    }

    try {
      console.log("[Broadcast] DB CREATE START", { title, userId: auth.userId });
      
      if (!p.broadcast) {
        throw new Error("The database client is still missing the Broadcast model after fresh initialization.");
      }

      const broadcast = await p.broadcast.create({
        data: {
          title: String(title).trim(),
          message: String(message).trim(),
          type: String(type || "INFO"),
          active: true,
          user: {
            connect: { id: auth.userId }
          }
        },
      });

      console.log("[Broadcast] DB CREATE SUCCESS", broadcast.id);

      // Trigger phone notifications in the background (don't block the response)
      broadcastToAllMembers(prisma, title, message).catch(err => {
        console.error("[Broadcast] Background notification error:", err);
      });

      return NextResponse.json(broadcast);
    } catch (prismaErr: any) {
      console.error("[Broadcast] DB CREATE FAILED", prismaErr);
      
      return NextResponse.json({ 
        error: "Database error while creating broadcast", 
        details: prismaErr.message || String(prismaErr),
        code: prismaErr.code || "UNKNOWN"
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error("Broadcast POST outer error:", err);
    return NextResponse.json({ 
      error: "Failed to process request", 
      details: err.message || String(err) 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized: No session found" }, { status: 401 });
    }
    
    if (auth.role !== "ADMIN" && auth.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const p = prisma as any;

    // Check if broadcast exists
    const existing = await p.broadcast.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }

    // Soft delete - set active to false instead of hard delete
    await p.broadcast.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Broadcast deleted successfully" });
  } catch (err: any) {
    console.error("Broadcast DELETE error:", err);
    return NextResponse.json({ 
      error: "Failed to delete broadcast", 
      details: err.message || String(err) 
    }, { status: 500 });
  }
}
