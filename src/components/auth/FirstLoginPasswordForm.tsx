"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import LoadingOverlay, { LoadingStep } from "@/components/ui/LoadingOverlay";
import { fetchJson } from "@/lib/fetchJson";

export default function FirstLoginPasswordForm() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("submit");

  const role = (session?.user as { role?: string })?.role;
  const dashboard =
    role === "ADMIN" || role === "SUPERADMIN"
      ? "/admin-dashboard"
      : "/member-dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError(false);

    if (newPassword !== confirmPassword) {
      setError(true);
      setMessage("New password and confirmation do not match");
      return;
    }

    setLoading(true);
    setLoadingStep("submit");

    const { ok, error: err, data } = await fetchJson<{ message?: string }>(
      "/api/auth/change-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      }
    );

    setLoading(false);

    if (!ok) {
      setError(true);
      setMessage(err || "Failed to update password");
      return;
    }

    await update({ mustChangePassword: false });

    setError(false);
    setMessage(data?.message || "Password updated successfully.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => router.push(dashboard), 1200);
  };

  return (
    <>
      <LoadingOverlay active={loading} step={loadingStep} title="Updating password" />

      <Card>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Set your new password
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          This is required on your first sign-in. Enter your current password,
          then choose a new password you will use from now on.
        </p>

        {message && !loading && (
          <div className="mb-4">
            <Alert variant={error ? "error" : "success"}>{message}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder=""
            required
            autoComplete="current-password"
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
          />
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            Save new password
          </Button>
        </form>
      </Card>
    </>
  );
}
