"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MemberOption = {
  id: string;
  name: string;
  username?: string;
  email?: string;
};

export default function MemberSearchSelect({
  members,
  value,
  onChange,
  label = "Member",
  required,
  allLabel,
  className = "",
}: {
  members: MemberOption[];
  value: string;
  onChange: (userId: string) => void;
  label?: string;
  required?: boolean;
  allLabel?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = members.find((m) => m.id === value);
  const isAll = value === "ALL";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...members];
    
    // Add "All" option if allLabel is provided
    const filteredList = q 
      ? list.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.username?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q)
        )
      : list;

    return filteredList;
  }, [members, query]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>

      {(selected || isAll) && !open && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-slate-700">
            {isAll ? (allLabel || "All Members") : selected?.name}
          </span>
          <button
            type="button"
            className="text-xs text-brand-600 hover:text-brand-700 font-bold uppercase tracking-wider transition-colors"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
          >
            Change
          </button>
        </div>
      )}

      {(!(selected || isAll) || open) && (
        <>
          <input
            type="search"
            value={query}
            autoFocus
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder="Search member..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
          />
          {open && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {allLabel && !query && (
                <li>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50 border-b border-slate-50"
                    onClick={() => {
                      onChange("ALL");
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="font-semibold text-brand-600">
                      {allLabel}
                    </span>
                  </button>
                </li>
              )}
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">
                  No members found
                </li>
              ) : (
                filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                      onClick={() => {
                        onChange(m.id);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium text-slate-800">
                        {m.name}
                      </span>
                      {(m.username || m.email) && (
                        <span className="block text-xs text-slate-500">
                          {m.username ?? m.email}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}

      <input type="hidden" name="userId" value={value} required={required} />
    </div>
  );
}
