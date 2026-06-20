import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst();
    console.log("Database connection OK. First user:", user?.name);
    
    // Check if broadcast property exists on prisma
    if (!prisma.broadcast) {
      console.error("ERROR: prisma.broadcast is undefined. Client needs generation.");
      return;
    }
    
    console.log("prisma.broadcast exists.");
  } catch (err) {
    console.error("Database check failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
