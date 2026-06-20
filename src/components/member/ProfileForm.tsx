"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { fetchJson } from "@/lib/fetchJson";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type UserData = {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  photoUrl?: string | null;
  role: string;
};

export default function ProfileForm() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const progress = useSimulatedProgress(loading);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    const { data, ok, error: err } = await fetchJson<UserData>(`/api/users/${userId}`);
    if (ok && data) {
      setFormData({
        name: data.name,
        phone: data.phone || "",
      });
      setPhotoUrl(data.photoUrl || null);
    } else {
      setError(true);
      setMessage(err || "Failed to load profile");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError(false);

    const { ok, error: err } = await fetchJson(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setSaving(false);
    if (!ok) {
      setError(true);
      setMessage(err || "Failed to update profile");
    } else {
      setMessage("Profile updated successfully!");
    }
  };

  const handlePhotoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Upload failed");
    }

    // Update user with new photo URL
    const updateRes = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: data.url }),
    });

    if (!updateRes.ok) {
      throw new Error("Failed to update profile");
    }

    setPhotoUrl(data.url);
    setMessage("Profile photo updated successfully!");
    setError(false);
  };

  const handlePhotoRemove = async () => {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: null }),
    });

    if (!res.ok) {
      throw new Error("Failed to remove photo");
    }

    setPhotoUrl(null);
    setMessage("Profile photo removed successfully!");
    setError(false);
  };

  if (loading) {
    return <Spinner label="Loading profile..." progress={progress} showPercentage />;
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900 mb-6">
        Edit your profile
      </h2>

      {message && (
        <div className="mb-4">
          <Alert variant={error ? "error" : "success"}>{message}</Alert>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <AvatarUpload
          currentPhotoUrl={photoUrl}
          name={formData.name}
          onUpload={handlePhotoUpload}
          onRemove={handlePhotoRemove}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder=""
          required
        />
        <Input
          label="Mobile Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder=""
          required
        />
        <div className="pt-2">
          <Button type="submit" fullWidth size="lg" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
