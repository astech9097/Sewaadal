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
    console.log("Checking columns of 'Broadcast' table...");
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Broadcast';
    `;
    console.log("Columns:", JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error("Column check failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
