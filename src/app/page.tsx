import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <h1>Droptine Pricing Tool</h1>
      <p className="lede">Internal scaffold. The full app (login, quotes, proposals, admin) is in progress.</p>
      <div className="card" style={{ maxWidth: 520 }}>
        <p style={{ marginBottom: 14 }}>
          <strong>Pricing preview</strong> — a temporary playground that recalculates the price live as
          you change options, so you can sanity-check how the numbers add up.
        </p>
        <Link
          href="/pricing-preview"
          style={{
            display: "inline-block",
            background: "var(--charcoal)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Open pricing preview →
        </Link>
      </div>
    </div>
  );
}
