import { prisma } from "../src/lib/db";

async function main() {
  try {
    console.log("Testing with app prisma instance...");
    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    console.log("Testing broadcast creation...");
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } }
    });

    if (!admin) {
      console.log("No admin found.");
      return;
    }

    const b = await prisma.broadcast.create({
      data: {
        title: "Test",
        message: "Test message",
        createdBy: admin.id
      }
    });
    console.log("Created successfully:", b.id);
  } catch (err) {
    console.error("APP PRISMA ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
