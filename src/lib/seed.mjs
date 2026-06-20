import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@sewadal.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@sewadal.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created!");
  console.log("📧 Email: admin@sewadal.com");
  console.log("🔑 Password: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());