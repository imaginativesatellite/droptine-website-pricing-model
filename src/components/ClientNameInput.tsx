"use client";

import { useState } from "react";

export default function ClientNameInput({
  id,
  value,
  placeholder,
  suggestions,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  suggestions: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 8)
    : [];

  return (
    <div className="autocomplete-wrap">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && matches.length > 0 && (
        <div className="autocomplete-list">
          {matches.map((m) => (
            <div
              key={m}
              className="autocomplete-item"
              onMouseDown={(e) => { e.preventDefault(); onChange(m); setOpen(false); }}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
