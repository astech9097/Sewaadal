"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useRef, useEffect } from "react";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: "en", label: "EN", full: "English" },
    { code: "hi", label: "हि", full: "हिन्दी" },
    { code: "mr", label: "म", full: "मराठी" },
  ] as const;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === language);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all hover:border-brand-300"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] text-brand-700 font-semibold">
          {currentLang?.label}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                language === lang.code ? "bg-brand-50 text-brand-700 font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-[10px] font-bold opacity-50">{lang.label}</span>
              <span>{lang.full}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
