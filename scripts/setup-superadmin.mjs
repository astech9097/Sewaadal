import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPERADMIN_USERNAME = "super1";
const SUPERADMIN_PASSWORD = "super123";
const SUPERADMIN_NAME = "Super Admin";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
`);

await pool.query(`
  DO $$
  BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END$$;
`);

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

const existing = await prisma.user.findFirst({
  where: {
    OR: [{ username: SUPERADMIN_USERNAME }, { role: "SUPERADMIN" }],
  },
});

if (existing) {
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: SUPERADMIN_NAME,
      username: SUPERADMIN_USERNAME,
      email: null,
      role: "SUPERADMIN",
      password: hash,
      mustChangePassword: false,
    },
  });
} else {
  await prisma.user.create({
    data: {
      name: SUPERADMIN_NAME,
      username: SUPERADMIN_USERNAME,
      role: "SUPERADMIN",
      password: hash,
      mustChangePassword: false,
    },
  });
}

console.log("Superadmin ready.");
console.log(`Username: ${SUPERADMIN_USERNAME}`);
console.log(`Password: ${SUPERADMIN_PASSWORD}`);

await prisma.$disconnect();
await pool.end();
