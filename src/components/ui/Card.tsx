import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50",
        paddingMap[padding],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
