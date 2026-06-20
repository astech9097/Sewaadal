import Card from "@/components/ui/Card";
import { motion } from "framer-motion";

type Accent = "blue" | "green" | "amber" | "rose" | "slate" | "brand";

const accentMap: Record<Accent, { value: string; ring: string }> = {
  blue: { value: "text-blue-600", ring: "ring-blue-500/10" },
  green: { value: "text-emerald-600", ring: "ring-emerald-500/10" },
  amber: { value: "text-amber-600", ring: "ring-amber-500/10" },
  rose: { value: "text-rose-600", ring: "ring-rose-500/10" },
  slate: { value: "text-slate-800", ring: "ring-slate-500/10" },
  brand: { value: "text-brand-600", ring: "ring-brand-500/10" },
};

export default function StatCard({
  label,
  value,
  sublabel,
  accent = "brand",
  icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: Accent;
  icon?: React.ReactNode;
}) {
  const colors = accentMap[accent];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`ring-1 ${colors.ring} hover:shadow-md transition-shadow !p-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <motion.p 
              key={String(value)}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-1 text-2xl font-bold tabular-nums ${colors.value}`}
            >
              {value}
            </motion.p>
            {sublabel && (
              <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">{sublabel}</p>
            )}
          </div>
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              {icon}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
