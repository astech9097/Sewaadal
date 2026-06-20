import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Testing connection...");
    await prisma.$connect();
    console.log("Connected.");

    console.log("Checking if 'Broadcast' table exists...");
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Broadcast'
      );
    `;
    console.log("Table check result:", JSON.stringify(tableExists));

    console.log("Attempting to create a test broadcast...");
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } }
    });

    if (!admin) {
      console.log("No admin found.");
      return;
    }

    const test = await prisma.broadcast.create({
      data: {
        title: "System Test",
        message: "Testing DB connection",
        createdBy: admin.id
      }
    });
    console.log("Success! Broadcast ID:", test.id);

  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    if (err.code) console.log("Prisma Error Code:", err.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
