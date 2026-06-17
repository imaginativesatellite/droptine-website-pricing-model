"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProposalLookup() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) router.push(`/proposal/${c}`);
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--charcoal)", marginBottom: 4 }}>
        LUNA <span style={{ color: "var(--gold)" }}>CREATIVE</span>
      </div>
      <h1>View your proposal</h1>
      <p className="lede">Enter the access code from your email.</p>

      <form onSubmit={go} className="card">
        <label className="qlabel" htmlFor="code">Access code</label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ABCD2345"
          autoCapitalize="characters"
          autoComplete="off"
          style={{ letterSpacing: 2, fontFamily: "monospace" }}
        />
        <button type="submit" className="btn-primary" style={{ marginTop: 12, width: "100%" }} disabled={!code.trim()}>
          View proposal
        </button>
      </form>
    </div>
  );
}
