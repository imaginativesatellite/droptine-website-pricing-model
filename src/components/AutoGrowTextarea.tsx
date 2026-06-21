"use client";

import { useEffect, useRef } from "react";

/** A textarea that grows to fit its content as the user types, so long
 *  answers don't end up in a small scrolling box. Starts at `minRows` and
 *  expands from there; re-measures on value changes (incl. a restored draft). */
export default function AutoGrowTextarea({
  value,
  onChange,
  minRows = 3,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Re-measure whenever the value changes (typing, paste, or a restored draft).
  useEffect(resize, [value]);

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ resize: "none", overflow: "hidden", ...rest.style }}
    />
  );
}
