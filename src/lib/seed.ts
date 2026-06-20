import { prisma } from "./db";


async function main() {
  await prisma.user.upsert({
    where: { email: "admin@sewadal.com" },
    update: { username: null },
    create: {
      name: "Admin",
      email: "admin@sewadal.com",
      username: null,
      password: "admin123", // Plain text password
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created!");
  console.log("Admin login — Email: admin@sewadal.com");
  console.log("Password: admin123");
}

main().catch(console.error).finally(() => prisma.$disconnect());