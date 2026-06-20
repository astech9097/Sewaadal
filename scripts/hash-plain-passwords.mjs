/**
 * One-time: bcrypt-hash any User.password that is not already hashed.
 * Run: node scripts/hash-plain-passwords.mjs
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const users = await prisma.user.findMany({
  select: { id: true, username: true, password: true },
});

let updated = 0;
for (const user of users) {
  if (!user.password || user.password.startsWith("$2")) continue;
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(user.password, 10) },
  });
  updated++;
  console.log("Hashed password for", user.username ?? user.id);
}

console.log(`Done. Updated ${updated} user(s).`);
await prisma.$disconnect();
await pool.end();
