import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const username = "g446";
const testPasswords = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["1234", "12345", "G446", "pass", "admin"];

const user = await prisma.user.findFirst({
  where: {
    username: { equals: username, mode: "insensitive" },
    role: "MEMBER",
  },
});

if (!user) {
  console.log("USER NOT FOUND with insensitive g446 + MEMBER role");
  const any = await prisma.user.findFirst({
    where: { username: { equals: "G446", mode: "insensitive" } },
  });
  console.log("Any G446 user:", any ? { role: any.role, username: any.username } : null);
} else {
  console.log("Found:", {
    username: user.username,
    role: user.role,
    passwordLen: user.password?.length,
    isBcrypt: user.password?.startsWith("$2"),
    passwordPreview: user.password?.substring(0, 20),
  });
  for (const pw of testPasswords) {
    let ok = false;
    if (user.password.startsWith("$2")) {
      ok = await bcrypt.compare(pw, user.password);
    } else {
      ok = user.password === pw;
    }
    console.log(`  password "${pw}" => ${ok ? "MATCH" : "no"}`);
  }
}

await prisma.$disconnect();
await pool.end();
