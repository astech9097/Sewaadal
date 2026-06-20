import { motion } from "framer-motion";

interface SpinnerProps {
  label?: string;
  progress?: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Spinner({ 
  label = "Loading...", 
  progress = 0,
  showPercentage = false,
  size = "md"
}: SpinnerProps) {
  // Use progress for circular fill if showPercentage is true, else fallback to spin
  const sizeMap = { sm: 32, md: 56, lg: 80 };
  const spinnerSize = sizeMap[size];
  const strokeWidth = size === "sm" ? 2 : 4;
  const center = spinnerSize / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={size === "sm" ? "" : "flex flex-col items-center justify-center gap-4 py-16 text-slate-500"}>
      <div className="relative" style={{ width: spinnerSize, height: spinnerSize }}>
        {/* Background Circle */}
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100"
          />
          {/* Progress/Spinning Circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animate={showPercentage ? { strokeDashoffset: offset } : { rotate: 360 }}
            transition={showPercentage 
              ? { duration: 0.3, ease: "easeOut" } 
              : { repeat: Infinity, duration: 1, ease: "linear" }
            }
            className="text-brand-500"
            style={{ 
              strokeDashoffset: showPercentage ? undefined : circumference * 0.7,
              transformOrigin: "center"
            }}
          />
        </svg>
        
        {showPercentage && size !== "sm" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-brand-600 tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      
      {size !== "sm" && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          {showPercentage && (
            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-brand-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
