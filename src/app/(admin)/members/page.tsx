"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import EditMemberModal from "@/components/admin/EditMemberModal";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type Member = {
  id?: string;
  name: string;
  username?: string | null;
  email?: string | null;
  phone: string;
  role: string;
};

type CurrentUser = {
  id: string;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER";
};

const emptyForm = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "MEMBER",
  group: "",
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const isMemberRole = form.role === "MEMBER" || form.role === "INCHARGE";
  const canCreateAdmins = currentUser?.role === "SUPERADMIN";

  const loadMembers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch(() => null);
  }, []);

  const filteredMembers = members.filter((m) => {
    const s = search.toLowerCase();
    return (
      (m.name?.toLowerCase() || "").includes(s) ||
      (m.username?.toLowerCase() || "").includes(s) ||
      (m.email?.toLowerCase() || "").includes(s) ||
      (m.phone || "").includes(s) ||
      (m.id?.toLowerCase() || "").includes(s)
    );
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "role") {
      setForm({ ...emptyForm, role: value, name: form.name });
      return;
    }
    if (name === "username") {
      setForm({
        ...form,
        username: value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6),
      });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError(false);

    const payload = isMemberRole
      ? {
          name: form.name,
          username: form.username,
          phone: form.phone,
          password: form.password,
          role: form.role,
          group: form.group ? parseInt(form.group, 10) : undefined,
        }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          role: canCreateAdmins ? form.role : "MEMBER",
          phone: form.phone || undefined,
        };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(true);
      setMessage(data.error || "Failed to create user");
      return;
    }

    setMessage(
      isMemberRole ? `${form.role === "INCHARGE" ? "Incharge" : "Member"} created successfully!` : "Admin created successfully!"
    );
    setForm({ ...emptyForm, role: form.role });
    loadMembers();
  };

  return (
    <div>
      <PageHeader
        title="Members"
        description=""
      />

      {message && (
        <div className="mb-6">
          <Alert variant={error ? "error" : "success"}>{message}</Alert>
        </div>
      )}

      <EditMemberModal
        memberId={editingId}
        onClose={() => setEditingId(null)}
        onSaved={() => {
          setMessage("User updated successfully.");
          setError(false);
          loadMembers();
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add user</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Role"
              name="role"
              value={form.role}
              onChange={handleChange}
              options={[
                { value: "MEMBER", label: "Member" },
                { value: "INCHARGE", label: "Group Incharge" },
                ...(canCreateAdmins
                  ? [{ value: "ADMIN", label: "Admin" }, { value: "SUPERADMIN", label: "Superadmin" }]
                  : []),
              ]}
            />
            <Input
              name="name"
              label="Full name"
              value={form.name}
              onChange={handleChange}
              placeholder=""
              required
            />
            {isMemberRole ? (
              <>
                <Input
                  name="username"
                  label="Username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder=""
                  required
                />
                <Input
                  name="phone"
                  label="Mobile number"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder=""
                  required
                />
                <Select
                  name="group"
                  label="Group (1-8)"
                  value={form.group}
                  onChange={handleChange}
                  required={form.role === "INCHARGE"}
                  options={[
                    { value: "", label: "— Select Group —" },
                    ...[1, 2, 3, 4, 5, 6, 7, 8].map((g) => ({
                      value: String(g),
                      label: `Group ${g}`,
                    })),
                  ]}
                />
              </>
            ) : (
              <Input
                name="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder=""
                required
              />
            )}
            <Input
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <Button type="submit" fullWidth>
              Save {isMemberRole ? (form.role === "INCHARGE" ? "incharge" : "member") : "admin"}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              User list
            </h2>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                placeholder="Search name, id, login..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <Spinner label="Loading users..." progress={progress} showPercentage />
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              title={search ? "No results found" : "No users yet"}
              description={search ? `No matches for "${search}"` : "Add your first member or admin using the form."}
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="py-3 px-6 font-semibold text-slate-700">Name</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Login</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Phone</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Role</th>
                    <th className="py-3 px-6 font-semibold text-right text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium text-slate-900">
                        {member.name}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {member.role === "ADMIN" || member.role === "SUPERADMIN"
                          ? member.email ?? "—"
                          : member.username ?? "—"}
                      </td>
                      <td className="py-4 px-4 text-slate-600 tabular-nums">
                        {member.phone || "—"}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          member.role === "SUPERADMIN" 
                            ? "bg-amber-100 text-amber-700" 
                            : member.role === "ADMIN"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingId(member.id!)}
                            className="rounded-lg font-semibold"
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
