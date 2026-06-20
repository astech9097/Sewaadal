type AlertVariant = "success" | "error" | "info";

const styles: Record<AlertVariant, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-rose-50 border-rose-200 text-rose-800",
  info: "bg-brand-50 border-brand-200 text-brand-800",
};

export default function Alert({
  children,
  variant = "info",
  className,
}: {
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-sm font-medium",
        styles[variant],
        className,
      ].filter(Boolean).join(" ")}
      role="alert"
    >
      {children}
    </div>
  );
}
