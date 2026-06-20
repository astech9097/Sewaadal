"use client";

import { useSession } from "next-auth/react";
import FirstLoginPasswordForm from "@/components/auth/FirstLoginPasswordForm";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import Link from "next/link";

export default function ChangePasswordClient() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const backHref =
    role === "ADMIN" || role === "SUPERADMIN"
      ? "/admin-dashboard"
      : "/member-dashboard";

  return (
    <div className="min-h-screen page-gradient p-6 lg:p-10">
      <div className="mx-auto max-w-lg">
        <Link
          href={backHref}
          className="mb-6 inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Change Password
        </h1>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
