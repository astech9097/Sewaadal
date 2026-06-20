"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

interface LiveSelfieCaptureProps {
  onCapture: (file: File, previewUrl: string) => void;
  onClear: () => void;
  captured: boolean;
}

export default function LiveSelfieCapture({
  onCapture,
  onClear,
  captured,
}: LiveSelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setStarting(true);
    setCameraReady(false);
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play().then(() => {
            setCameraReady(true);
          });
        };
      }
    } catch {
      setCameraError(
        "Could not access camera. Allow camera permission to take a live selfie for PV."
      );
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!captured) {
      startCamera();
    }
    return () => stopCamera();
  }, [captured, startCamera, stopCamera]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !cameraReady) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        setPreview(url);
        stopCamera();
        onCapture(file, url);
      },
      "image/jpeg",
      0.92
    );
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onClear();
    startCamera();
  };

  if (captured && preview) {
    return (
      <div className="space-y-3">
        <img
          src={preview}
          alt="Captured selfie"
          className="h-56 w-full rounded-xl object-cover border-2 border-brand-200"
        />
        <p className="text-xs text-slate-500">
          Live selfie captured. This will be sent for admin approval.
        </p>
        <Button type="button" variant="ghost" fullWidth onClick={retake}>
          Retake selfie
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">
        Live selfie (required for PV)
      </p>
      <p className="text-xs text-slate-500">
        Use your front camera now. Gallery uploads are not allowed for PV.
      </p>

      {cameraError && <Alert variant="error">{cameraError}</Alert>}

      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-brand-300 bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-56 w-full object-cover mirror"
          style={{ transform: "scaleX(-1)" }}
        />
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            {starting ? "Starting camera..." : "Camera off"}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          fullWidth
          onClick={takePhoto}
          disabled={!!cameraError || starting || !cameraReady}
        >
          Capture live selfie
        </Button>
        {cameraError && (
          <Button type="button" variant="ghost" onClick={startCamera}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
