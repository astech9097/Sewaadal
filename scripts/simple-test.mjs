import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Connecting...");
    await prisma.$connect();
    
    const user = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } }
    });

    if (!user) {
      console.log("No admin user found.");
      return;
    }

    console.log("Creating broadcast for user:", user.id);
    const b = await prisma.broadcast.create({
      data: {
        title: "Test " + Date.now(),
        message: "Test message",
        createdBy: user.id
      }
    });
    console.log("SUCCESS! ID:", b.id);
    
    await prisma.broadcast.delete({ where: { id: b.id } });
    console.log("Cleanup OK.");

  } catch (err) {
    console.error("TEST FAILED:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
