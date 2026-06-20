import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function normalizeUsername(v) {
  return v.trim().toLowerCase();
}

async function authorize(credentials) {
  const password = String(credentials?.password ?? "");
  const loginAs = String(credentials?.loginAs ?? "member");
  const login = String(
    credentials?.username ?? credentials?.login ?? ""
  ).trim();

  if (!login || !password) return { error: "empty login or password" };

  let user = null;
  if (loginAs === "admin") {
    user = await prisma.user.findUnique({
      where: { email: login.toLowerCase() },
    });
    if (!user || user.role !== "ADMIN") return { error: "admin not found" };
  } else {
    user = await prisma.user.findFirst({
      where: {
        username: { equals: normalizeUsername(login), mode: "insensitive" },
        role: "MEMBER",
      },
    });
    if (!user) return { error: "member not found" };
  }

  let isValid = false;
  if (user.password.startsWith("$2")) {
    isValid = await bcrypt.compare(password, user.password);
  } else {
    isValid = user.password === password;
  }
  if (!isValid) return { error: "password mismatch", dbPass: user.password };
  return { ok: true, user: user.username, role: user.role };
}

console.log(await authorize({ login: "G446", password: "G446", loginAs: "member" }));
console.log(await authorize({ username: "G446", password: "G446", loginAs: "member" }));
console.log(await authorize({ login: "G446", password: "12345", loginAs: "member" }));

await prisma.$disconnect();
await pool.end();
