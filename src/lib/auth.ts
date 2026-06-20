import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { normalizeUsername } from "./username";

async function findMemberByUsername(login: string) {
  const normalized = normalizeUsername(login);
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: normalized },
        { username: { equals: login.trim(), mode: "insensitive" } },
      ],
      role: "MEMBER",
    },
  });
}

async function findSuperadminByUsername(login: string) {
  const normalized = normalizeUsername(login);
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: normalized },
        { username: { equals: login.trim(), mode: "insensitive" } },
      ],
      role: "SUPERADMIN",
    },
  });
}

async function verifyPassword(
  plain: string,
  stored: string,
  userId: string
): Promise<boolean> {
  const input = plain.trim();

  // Support hashed passwords (if any exist)
  if (stored.startsWith("$2")) {
    return bcrypt.compare(input, stored);
  }

  // Plain-text comparison
  return stored === input || stored.toLowerCase() === input.toLowerCase();
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginAs: { label: "Login as", type: "text" },
      },
      async authorize(credentials) {
        const password = String(credentials?.password ?? "");
        const login = String(credentials?.username ?? "").trim();

        if (!password || !login) return null;

        let user = null;

        // Try to find user by email first (Admin)
        if (login.includes("@")) {
          user = await prisma.user.findUnique({
            where: { email: login.toLowerCase() },
          });
        }

        // If not found or not an email, try to find by username (Member or Superadmin)
        if (!user) {
          const normalized = normalizeUsername(login);
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: normalized },
                { username: { equals: login, mode: "insensitive" } },
              ],
            },
          });
        }

        if (!user) return null;

        const isValid = await verifyPassword(password, user.password, user.id);
        if (!isValid) return null;

        if ((user.role === "MEMBER" || user.role === "SUPERADMIN" || user.role === "INCHARGE") && user.username) {
          const normalized = normalizeUsername(user.username);
          if (user.username !== normalized) {
            await prisma.user.update({
              where: { id: user.id },
              data: { username: normalized },
            });
            user.username = normalized;
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? `${user.username ?? user.id}@member.local`,
          username: user.username,
          role: user.role,
          phone: user.phone,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.sub = user.id;
        token.phone = (user as { phone?: string }).phone;
        token.username = (user as { username?: string | null }).username;
        token.email = user.email;
        token.mustChangePassword = Boolean(
          (user as { mustChangePassword?: boolean }).mustChangePassword
        );
      }

      if (trigger === "update" && session) {
        const s = session as { mustChangePassword?: boolean };
        if (s.mustChangePassword === false) {
          token.mustChangePassword = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id =
          (token.id as string) ?? (token.sub as string);
        (session.user as { phone?: string }).phone = token.phone as
          | string
          | undefined;
        (session.user as { username?: string | null }).username =
          token.username as string | null | undefined;
        session.user.email = token.email as string;
        (session.user as { mustChangePassword?: boolean }).mustChangePassword =
          Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
