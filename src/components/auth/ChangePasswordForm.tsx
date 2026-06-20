"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { fetchJson } from "@/lib/fetchJson";

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(true);
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    setMessage("");
    setError(false);

    const { ok, error: err } = await fetchJson("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    });

    setLoading(false);

    if (!ok) {
      setError(true);
      setMessage(err || "Failed to update password");
    } else {
      setMessage("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <>
      <LoadingOverlay active={loading} title="Updating password" />

      <Card>
        <h2 className="text-xl font-semibold text-slate-900 mb-6">
          Change your password
        </h2>

        {message && (
          <div className="mb-4">
            <Alert variant={error ? "error" : "success"}>{message}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Old Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder=""
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder=""
            required
            minLength={4}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder=""
            required
            minLength={4}
          />
          <div className="pt-2">
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Updating..." : "Change password"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
