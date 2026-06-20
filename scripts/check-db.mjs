import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking database connection...");
    await prisma.$connect();
    console.log("Connected successfully.");

    console.log("Checking 'Broadcast' table...");
    // @ts-ignore
    const count = await prisma.broadcast.count();
    console.log(`'Broadcast' table exists and has ${count} records.`);
  } catch (err) {
    console.error("Database check failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
