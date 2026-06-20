"use client";

import { useState } from "react";
import { getBestPosition } from "@/lib/geolocation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Select from "@/components/ui/Select";
import LiveSelfieCapture from "@/components/member/LiveSelfieCapture";
import LoadingOverlay, { LoadingStep } from "@/components/ui/LoadingOverlay";
import { fetchJson } from "@/lib/fetchJson";
import type { AttendanceStatus } from "@/types";

export default function MarkAttendanceForm() {
  const [status, setStatus] = useState<AttendanceStatus>("P");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("generic");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const isPV = status === "PV";

  const handleSelfieCapture = (file: File, _previewUrl: string) => {
    setSelfieFile(file);
    setSelfieCaptured(true);
  };

  const handleSelfieClear = () => {
    setSelfieFile(null);
    setSelfieCaptured(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep(isPV ? "location" : "submit");
    setMessage("");
    setError(false);
    try {
      if (isPV && !selfieFile) {
        throw new Error("Please capture a live selfie for PV attendance.");
      }

      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;
      let photoUrl: string | undefined;

      if (isPV) {
        const position = await getBestPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        accuracy = position.coords.accuracy;

        if (selfieFile) {
          setLoadingStep("upload");
          const formData = new FormData();
          formData.append("file", selfieFile);
          const uploadResult = await fetchJson<{ url?: string }>("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!uploadResult.ok) {
            throw new Error(uploadResult.error || "Selfie upload failed");
          }
          photoUrl = uploadResult.data?.url;
        }
      }

      setLoadingStep("submit");
      const result = await fetchJson<{
        pending?: boolean;
        message?: string;
        areaName?: string;
        error?: string;
      }>("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          latitude,
          longitude,
          accuracy,
          photoUrl,
        }),
      });

      if (!result.ok) {
        const errorMsg = result.error || "Failed to mark attendance";
        throw new Error(errorMsg);
      }

      const data = result.data!;

      setLoadingStep("done");
      await new Promise((r) => setTimeout(r, 800));

      if (data.pending) {
        setMessage(
          data.message ||
            "PV submitted with live selfie. Admin will approve it shortly."
        );
      } else {
        setMessage("Attendance marked successfully for today!");
      }

      setSelfieFile(null);
      setSelfieCaptured(false);
      if (!isPV) setStatus("P");
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Could not mark attendance"
      );
    } finally {
      setLoading(false);
      setLoadingStep("generic");
    }
  };

  return (
    <>
      <LoadingOverlay
        active={loading}
        step={loadingStep}
        title={
          loadingStep === "done"
            ? "Done"
            : isPV
              ? "Submitting PV"
              : "Marking attendance"
        }
      />

      <Card>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Mark today's attendance
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Submit today's attendance. <strong>A</strong> and <strong>P</strong> are saved instantly. 
          <strong>PV</strong> requires admin approval, location verification, and a live selfie.
        </p>

        {message && !loading && (
          <div className="mb-4">
            <Alert variant={error ? "error" : "success"}>{message}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Status"
            name="status"
            value={status}
            onChange={(e) => {
              const next = e.target.value as AttendanceStatus;
              setStatus(next);
              if (next !== "PV") handleSelfieClear();
            }}
            options={[
              { value: "P", label: "P — Present (instant)" },
              { value: "PV", label: "PV — Present in Vardi (selfie + approval)" },
              { value: "A", label: "A — Absent (instant)" },
            ]}
          />

          {isPV ? (
            <LiveSelfieCapture
              captured={selfieCaptured}
              onCapture={(file, previewUrl) => handleSelfieCapture(file, previewUrl)}
              onClear={handleSelfieClear}
            />
          ) : (
            <p className="text-xs text-slate-500 rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
              {status === "P" 
                ? "P attendance is saved instantly without photo or location."
                : "A (Absent) is saved instantly."}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={loading || (isPV && !selfieCaptured)}
          >
            {isPV ? "Submit PV for approval" : "Mark attendance"}
          </Button>
        </form>
      </Card>
    </>
  );
}
