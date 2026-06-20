import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
`);

const members = await pool.query(`
  UPDATE "User" SET "mustChangePassword" = true WHERE role = 'MEMBER';
`);

console.log(`Column ready. Marked ${members.rowCount} member(s) for first-login password change.`);

await pool.end();
