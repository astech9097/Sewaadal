"use client";

import {
  DAY_NAMES,
  SEWA_SLOTS,
  WEEK_ORDINALS,
  type SewaFormState,
  type SewaSlotKey,
} from "@/lib/dutySchedule";

type SewaSlotFieldsProps = {
  value: SewaFormState;
  onChange: (next: SewaFormState) => void;
};

export default function SewaSlotFields({ value, onChange }: SewaSlotFieldsProps) {
  const updateSlot = (
    key: SewaSlotKey,
    field: "weekOfMonth" | "dayOfWeek",
    raw: string
  ) => {
    if (raw === "") {
      if (field === "weekOfMonth") {
        onChange({
          ...value,
          [key]: { weekOfMonth: null, dayOfWeek: null },
        });
        return;
      }
      onChange({
        ...value,
        [key]: { ...value[key], dayOfWeek: null },
      });
      return;
    }

    onChange({
      ...value,
      [key]: { ...value[key], [field]: parseInt(raw, 10) },
    });
  };

  const clearSlot = (key: SewaSlotKey) => {
    onChange({
      ...value,
      [key]: { weekOfMonth: null, dayOfWeek: null },
    });
  };

  return (
    <div className="space-y-3">
      {SEWA_SLOTS.map((slot) => {
        const slotValue = value[slot.key];
        const hasValue =
          slotValue.weekOfMonth != null && slotValue.dayOfWeek != null;

        return (
          <div
            key={slot.key}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{slot.label}</p>
              {hasValue && (
                <button
                  type="button"
                  onClick={() => clearSlot(slot.key)}
                  className="text-xs font-medium text-slate-500 hover:text-rose-600"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[120px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Occurrence
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={slotValue.weekOfMonth ?? ""}
                  onChange={(e) =>
                    updateSlot(slot.key, "weekOfMonth", e.target.value)
                  }
                >
                  <option value="">— None —</option>
                  {WEEK_ORDINALS.map((label, i) => (
                    <option key={label} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Day
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={
                    slotValue.dayOfWeek != null ? String(slotValue.dayOfWeek) : ""
                  }
                  onChange={(e) =>
                    updateSlot(slot.key, "dayOfWeek", e.target.value)
                  }
                  disabled={slotValue.weekOfMonth == null}
                >
                  <option value="">— None —</option>
                  {DAY_NAMES.map((day, i) => (
                    <option key={day} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
