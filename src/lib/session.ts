import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";

export type AuthContext = {
  userId: string;
  role: string;
  email?: string;
  username?: string;
};

export async function getAuthContext(
  req?: NextRequest
): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  const token = req
    ? await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    : null;

  const userId =
    (session?.user as { id?: string })?.id ??
    (token as { id?: string })?.id ??
    token?.sub;

  const role =
    (session?.user as { role?: string })?.role ??
    (token as { role?: string })?.role;

  if (!userId || !role) return null;

  return {
    userId: String(userId),
    role: String(role),
    email: session?.user?.email ?? (token?.email as string | undefined),
    username:
      (session?.user as { username?: string })?.username ??
      (token?.username as string | undefined),
  };
}
