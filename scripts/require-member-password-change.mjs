/**
 * Mark all existing members to change password on next login.
 * Run: node scripts/require-member-password-change.mjs
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const result = await prisma.user.updateMany({
  where: { role: "MEMBER" },
  data: { mustChangePassword: true },
});

console.log(`Updated ${result.count} member(s) — password change required on next login.`);

await prisma.$disconnect();
await pool.end();
