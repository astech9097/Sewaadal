import { prisma } from "@/lib/db";

async function main() {
  console.log("Disabling mustChangePassword for all users...");
  
  const updated = await prisma.user.updateMany({
    where: {},
    data: { mustChangePassword: false }
  });
  
  console.log(`Updated ${updated.count} users!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
