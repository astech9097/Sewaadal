import { prisma } from "../src/lib/db.js";

async function main() {
  try {
    console.log("Checking DB connection with app prisma...");
    const user = await prisma.user.findFirst();
    console.log("DB Connection OK. Found user:", user?.id);

    console.log("Attempting direct broadcast creation...");
    if (!user) {
      console.log("No user found to link broadcast.");
      return;
    }

    const b = await prisma.broadcast.create({
      data: {
        title: "Test " + Date.now(),
        message: "Test message",
        createdBy: user.id
      }
    });
    console.log("SUCCESS! Created broadcast ID:", b.id);

    console.log("Cleaning up test broadcast...");
    await prisma.broadcast.delete({ where: { id: b.id } });
    console.log("Cleaned up.");

  } catch (err) {
    console.error("APP PRISMA TEST FAILED:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
