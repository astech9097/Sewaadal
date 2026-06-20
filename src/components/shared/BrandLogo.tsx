"use client";

import { useState } from "react";

type BrandLogoProps = {
  size?: number;
  className?: string;
};

export default function BrandLogo({ size = 40, className = "" }: BrandLogoProps) {
  const [broken, setBroken] = useState(false);
  const dimension = `${size}px`;

  if (broken) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-brand-500 text-white font-bold ${className}`.trim()}
        style={{ width: dimension, height: dimension }}
      >
        S
      </div>
    );
  }

  return (
    <img
      src="/logo-sewadal.png"
      alt="Sewadal logo"
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={`rounded-full object-cover border border-brand-200 ${className}`.trim()}
    />
  );
}
