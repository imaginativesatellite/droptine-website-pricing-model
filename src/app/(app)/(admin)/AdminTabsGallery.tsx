"use client";

import { useState } from "react";

// TEMP: ten candidate looks for the admin sub-menu, rendered at the bottom of
// the Users page so a style can be picked — same idea as the dashboard toggle
// gallery. Each bar keeps its own local "active" index (purely visual, doesn't
// navigate) so hover/active states can be compared. Once a style is chosen,
// delete this component, its render in users/page.tsx, and the .atgN rules.
const LABELS = ["Users", "Pricing", "Tests", "Pricing Preview", "Export"];

const VARIANTS: { n: number; label: string }[] = [
  { n: 1, label: "Filled pill bar (current)" },
  { n: 2, label: "Underline tabs" },
  { n: 3, label: "Folder tabs" },
  { n: 4, label: "Sliding-pill segmented" },
  { n: 5, label: "Gold pill active" },
  { n: 6, label: "Minimal — thick underline" },
  { n: 7, label: "Outlined active" },
  { n: 8, label: "Boxed button group" },
  { n: 9, label: "Dot indicator" },
  { n: 10, label: "Raised folder tabs" },
];

function Bar({ n }: { n: number }) {
  const [active, setActive] = useState(0);
  return (
    <div className={`atg atg${n}`}>
      {LABELS.map((l, i) => (
        <button key={l} type="button" className={i === active ? "active" : ""} onClick={() => setActive(i)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function AdminTabsGallery() {
  return (
    <section style={{ marginTop: 48, paddingTop: 24, borderTop: "1px dashed var(--line)" }}>
      <div className="section-label">Admin sub-menu styles — pick one</div>
      <p className="help" style={{ marginBottom: 20 }}>
        Temporary preview. Click the tabs in any bar to see its active state; tell me the
        number you like and I&apos;ll apply it to the real sub-menu and remove the rest.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {VARIANTS.map(({ n, label }) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="help" style={{ fontSize: "0.8rem" }}>{n}. {label}</span>
            <Bar n={n} />
          </div>
        ))}
      </div>
    </section>
  );
}
