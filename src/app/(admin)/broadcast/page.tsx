"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { fetchJson } from "@/lib/fetchJson";
import { useLanguage } from "@/context/LanguageContext";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

export default function BroadcastPage() {
  const { t } = useLanguage();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState<Broadcast | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "INFO",
  });

  const loadBroadcasts = async () => {
    setLoading(true);
    const res = await fetchJson<Broadcast[]>("/api/broadcast");
    if (res.ok && res.data) {
      setBroadcasts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetchJson<any>("/api/broadcast", {
      method: "POST",
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage("Broadcast sent successfully! All members will see this notice.");
      setError(false);
      setForm({ title: "", message: "", type: "INFO" });
      loadBroadcasts();
    } else {
      console.error("Broadcast Error Full Object:", JSON.stringify(res, null, 2));
      
      const apiError = res.data && typeof res.data === "object" ? res.data as any : {};
      const code = apiError.code || "UNKNOWN";
      const details = apiError.details || res.error || "Internal Server Error";
      const mainError = apiError.error || "Failed to send broadcast";

      setMessage(`${mainError} (${code}): ${details}`);
      setError(true);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!broadcastToDelete) return;
    
    setDeleting(true);
    const res = await fetchJson<any>(`/api/broadcast?id=${broadcastToDelete.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMessage("Broadcast deleted successfully!");
      setError(false);
      loadBroadcasts();
    } else {
      setMessage(res.error || "Failed to delete broadcast");
      setError(true);
    }
    
    setDeleting(false);
    setDeleteModalOpen(false);
    setBroadcastToDelete(null);
  };

  const openDeleteModal = (broadcast: Broadcast) => {
    setBroadcastToDelete(broadcast);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("broadcast_notice")} />

      {message && (
        <Alert variant={error ? "error" : "success"}>{message}</Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Send New Notice</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Notice Title"
              placeholder="e.g. Special Meeting"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Message</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition min-h-[120px]"
                placeholder="Type your notice here..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <Select
              label="Notice Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { value: "INFO", label: "Information (Blue)" },
                { value: "WARNING", label: "Important/Warning (Orange)" },
                { value: "SUCCESS", label: "Announcement (Green)" },
              ]}
            />
            <Button type="submit" fullWidth disabled={saving}>
              {saving ? "Sending..." : "Send Broadcast"}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Notices</h2>
          {loading ? (
            <Spinner label="Loading notices..." progress={progress} showPercentage />
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No active notices sent yet.</div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((b) => (
                <div key={b.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900">{b.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => openDeleteModal(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete broadcast"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{b.message}</p>
                  <div className="mt-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      b.type === "WARNING" ? "bg-orange-100 text-orange-700" :
                      b.type === "SUCCESS" ? "bg-green-100 text-green-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {b.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && broadcastToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mt-3 text-center text-lg font-bold text-slate-900">Delete Broadcast</h3>
              <p className="mt-1 text-center text-sm text-slate-500">
                Are you sure you want to delete the broadcast "{broadcastToDelete.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setBroadcastToDelete(null);
                }}
                fullWidth
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                fullWidth
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
