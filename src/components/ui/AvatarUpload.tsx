"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Button from "./Button";
import Spinner from "./Spinner";

interface AvatarUploadProps {
  currentPhotoUrl?: string | null;
  name: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export default function AvatarUpload({
  currentPhotoUrl,
  name,
  onUpload,
  onRemove,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    try {
      await onUpload(file);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload photo");
    } finally {
      setUploading(false);
    }

    // Cleanup
    URL.revokeObjectURL(objectUrl);
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    if (!confirm("Are you sure you want to remove your photo?")) return;

    setUploading(true);
    try {
      await onRemove();
    } catch (error) {
      console.error("Remove failed:", error);
      alert("Failed to remove photo");
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || currentPhotoUrl;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 text-3xl font-bold">
              {initials}
            </div>
          )}
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {currentPhotoUrl ? "Change Photo" : "Upload Photo"}
        </Button>

        {currentPhotoUrl && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-slate-400 text-center">
        Supported: JPG, PNG, GIF (max 5MB)
      </p>
    </div>
  );
}
