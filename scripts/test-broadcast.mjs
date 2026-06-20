import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } }
    });

    if (!admin) {
      console.log("No admin found to create broadcast.");
      return;
    }

    console.log(`Using admin: ${admin.name} (${admin.id})`);

    const broadcast = await prisma.broadcast.create({
      data: {
        title: "Debug Notice",
        message: "This is a test notice from debug script",
        type: "INFO",
        createdBy: admin.id
      }
    });

    console.log("Broadcast created successfully:", broadcast.id);
  } catch (err) {
    console.error("FAILED to create broadcast:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
