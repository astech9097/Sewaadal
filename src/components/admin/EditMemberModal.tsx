"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import SewaSlotFields from "@/components/admin/SewaSlotFields";
import { fetchJson } from "@/lib/fetchJson";
import { sewaFormFromUser, type SewaFormState } from "@/lib/dutySchedule";

type MemberDetail = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  groups: number[];
  sewas: SewaFormState;
};

type CurrentUser = {
  id: string;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER";
};

const emptySewas = (): SewaFormState => sewaFormFromUser({});

type EditMemberModalProps = {
  memberId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditMemberModal({
  memberId,
  onClose,
  onSaved,
}: EditMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "MEMBER",
    groups: [] as number[],
  });
  const [sewas, setSewas] = useState<SewaFormState>(emptySewas);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const usesUsernameLogin =
    form.role === "MEMBER" || form.role === "SUPERADMIN" || form.role === "INCHARGE";

  useEffect(() => {
    if (!memberId) return;

    setLoading(true);
    setMessage("");
    setError(false);

    fetchJson<MemberDetail>(`/api/users/${memberId}`).then(({ data, ok, error: err }) => {
      setLoading(false);
      if (!ok || !data) {
        setError(true);
        setMessage(err || "Failed to load user");
        return;
      }
      setForm({
        name: data.name,
        username: data.username ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        password: "",
        role: data.role,
        groups: data.groups,
      });
      setSewas(data.sewas ?? emptySewas());
    });
  }, [memberId]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch(() => null);
  }, []);

  if (!memberId) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "username") {
      setForm({
        ...form,
        username: value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6),
      });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const handleGroupToggle = (groupNum: number) => {
    setForm(prev => {
      if (prev.groups.includes(groupNum)) {
        return { ...prev, groups: prev.groups.filter(g => g !== groupNum) };
      } else {
        return { ...prev, groups: [...prev.groups, groupNum] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError(false);

    const payload: Record<string, unknown> = {
      name: form.name,
      role: form.role,
      groups: form.groups,
      sewas: (form.role === "MEMBER" || form.role === "INCHARGE") ? sewas : undefined,
    };

    if (usesUsernameLogin) {
      payload.username = form.username;
      if (form.role === "MEMBER" || form.role === "INCHARGE") payload.phone = form.phone;
      if (form.email.trim()) payload.email = form.email;
    } else {
      payload.email = form.email;
      if (form.phone.trim()) payload.phone = form.phone;
    }

    if (form.password.trim()) payload.password = form.password;

    const { ok, error: err } = await fetchJson(`/api/users/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!ok) {
      setError(true);
      setMessage(err || "Failed to update user");
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Edit user</h2>
            <p className="text-sm text-slate-500">
              {form.role === "MEMBER" || form.role === "INCHARGE"
                ? `${form.role === "INCHARGE" ? "Incharge" : "Member"} login: username + password`
                : form.role === "SUPERADMIN"
                  ? "Superadmin login: username + password"
                  : "Admin login: email + password"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {message && (
          <div className="mb-4">
            <Alert variant={error ? "error" : "success"}>{message}</Alert>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {currentUser?.role === "SUPERADMIN" ? (
              <Select
                label="Role"
                name="role"
                value={form.role}
                onChange={handleChange}
                options={[
                  { value: "MEMBER", label: "Member" },
                  { value: "INCHARGE", label: "Group Incharge" },
                  { value: "ADMIN", label: "Admin" },
                  { value: "SUPERADMIN", label: "Superadmin" },
                ]}
              />
            ) : currentUser?.role === "ADMIN" ? (
              <Select
                label="Role"
                name="role"
                value={form.role}
                onChange={handleChange}
                options={[
                  { value: "MEMBER", label: "Member" },
                  { value: "INCHARGE", label: "Group Incharge" },
                ]}
              />
            ) : (
              <Input
                name="roleView"
                label="Role"
                value={form.role}
                onChange={() => null}
                disabled
              />
            )}
            <Input
              name="name"
              label="Full name"
              value={form.name}
              onChange={handleChange}
              required
            />
            {usesUsernameLogin ? (
              <>
                <Input
                  name="username"
                  label={form.role === "SUPERADMIN" ? "Superadmin username" : form.role === "INCHARGE" ? "Incharge username" : "Username"}
                  value={form.username}
                  onChange={handleChange}
                  required
                  hint={
                    form.role === "SUPERADMIN"
                      ? "Use a memorable superadmin username"
                      : form.role === "INCHARGE"
                        ? "2–6 letters or numbers"
                        : "2–6 letters or numbers"
                  }
                />
                {form.role === "MEMBER" || form.role === "INCHARGE" ? (
                  <>
                    <Input
                      name="phone"
                      label="Mobile number"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Groups</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <label
                            key={num}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              form.groups.includes(num)
                                ? "border-brand-500 bg-brand-50"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={form.groups.includes(num)}
                              onChange={() => handleGroupToggle(num)}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Group {num}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Input
                    name="email"
                    label="Email (optional)"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                )}
              </>
            ) : (
              <Input
                name="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            )}
            <Input
              name="password"
              label="New password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Leave blank to keep current"
            />

            {form.password.trim() && (
              <Alert variant="info" className="text-xs">
                Password will be updated and hashed for security.
              </Alert>
            )}

            {(form.role === "MEMBER" || form.role === "INCHARGE") && (
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Sewa schedule
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  First / Second / Third Sewa and Extra Sewa 1 & 2
                </p>
                <SewaSlotFields value={sewas} onChange={setSewas} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" fullWidth disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
