"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { fetchJson } from "@/lib/fetchJson";
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

type LocationRow = {
  id: string;
  name: string;
  mapUrl?: string;
  latitude: number;
  longitude: number;
  radius: number;
};

export default function SettingsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const progress = useSimulatedProgress(loading);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, ok, error: err } = await fetchJson<{ locations: LocationRow[] }>(
      "/api/location"
    );
    if (ok && data?.locations) {
      setLocations(data.locations);
    } else {
      setError(true);
      setMessage(err || "Failed to load locations");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateRadius = async (id: string, radius: number) => {
    setSavingId(id);
    setMessage("");
    setError(false);

    const { ok, error: err } = await fetchJson("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, radius }),
    });

    setSavingId(null);
    if (!ok) {
      setError(true);
      setMessage(err || "Failed to update");
      return;
    }
    setMessage("Radius updated.");
    load();
  };

  const syncSites = async () => {
    setLoading(true);
    const { ok, error: err } = await fetchJson("/api/location", {
      method: "PUT",
    });
    if (!ok) {
      setError(true);
      setMessage(err || "Sync failed");
    } else {
      setMessage("Approved centres synced from Google Maps links.");
      await load();
      return;
    }
    setLoading(false);
  };

  if (loading && locations.length === 0) {
    return <Spinner label="Loading settings..." progress={progress} showPercentage />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Approved attendance centres"
        description=""
        action={
          <Button type="button" variant="ghost" size="sm" onClick={syncSites}>
            Sync centres
          </Button>
        }
      />

      {message && (
        <div className="mb-6">
          <Alert variant={error ? "error" : "success"}>{message}</Alert>
        </div>
      )}

      <div className="space-y-6">
        {locations.map((loc) => (
          <Card key={loc.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {loc.name}
                </h2>
                {loc.mapUrl && (
                  <a
                    href={loc.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-brand-600 hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  GPS: {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                label="Allowed radius (meters)"
                type="number"
                defaultValue={String(loc.radius)}
                id={`radius-${loc.id}`}
                hint="Member must be within this distance to mark attendance"
              />
              <Button
                type="button"
                disabled={savingId === loc.id}
                onClick={() => {
                  const input = document.getElementById(
                    `radius-${loc.id}`
                  ) as HTMLInputElement;
                  updateRadius(loc.id, parseFloat(input.value));
                }}
              >
                {savingId === loc.id ? "Saving…" : "Save radius"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
