import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const attendance = await prisma.attendance.findMany({
    take: 10,
    include: {
      user: true
    }
  });
  
  console.log("Found " + attendance.length + " records");
  attendance.forEach(a => {
    console.log(`ID: ${a.id}, Date: ${a.date}, UserId: ${a.userId}, UserFound: ${!!a.user}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
