"use client";

import { useState, useEffect } from "react";

export function useSimulatedProgress(loading: boolean, duration: number = 1500) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      return;
    }

    setProgress(0);
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    const increment = 95 / steps; // Go up to 95% during duration

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return Math.min(prev + increment + (Math.random() * 2), 95);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [loading, duration]);

  return progress;
}
