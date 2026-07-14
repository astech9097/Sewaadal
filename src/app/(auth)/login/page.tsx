"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import BrandLogo from "@/components/shared/BrandLogo";

type LoginMode = "member" | "admin" | "superadmin";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username: login.trim(),
      password: password.trim(),
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok) {
      setError("Invalid username or password. Please try again.");
      return;
    }

    const session = await getSession();
    const user = session?.user as { role?: string; mustChangePassword?: boolean };
    const role = user?.role;

    if (role === "ADMIN" || role === "SUPERADMIN") {
      router.push("/admin-dashboard");
    } else {
      router.push("/mark-attendance");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 page-gradient">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-300/40 blur-3xl"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-300/30 backdrop-blur-sm sm:p-10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-brand-500/20 ring-1 ring-brand-100">
              <BrandLogo size={52} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sewadal Attendance
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in with your credentials
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Username or Email"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder=""
              required
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
              autoComplete="current-password"
            />
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Sewadal · Attendance &amp; member management
        </p>
      </div>
    </div>
  );
}
