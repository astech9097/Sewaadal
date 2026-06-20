import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const login = process.argv[2] || "g446";

const users = await prisma.user.findMany({
  select: {
    name: true,
    username: true,
    email: true,
    role: true,
    password: true,
  },
});

const normalized = login.trim().toLowerCase();
const match = users.filter(
  (u) => u.username?.toLowerCase() === normalized
);

console.log("Looking for username:", normalized);
console.log(
  "Match:",
  match.map((u) => ({
    name: u.name,
    username: u.username,
    role: u.role,
    isBcrypt: u.password?.startsWith("$2"),
    passwordLength: u.password?.length,
  }))
);
console.log("All usernames:", users.map((u) => u.username).filter(Boolean));

await prisma.$disconnect();
await pool.end();
