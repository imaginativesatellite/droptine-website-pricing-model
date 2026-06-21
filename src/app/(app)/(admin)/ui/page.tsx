import { requireAdmin } from "@/lib/session";

// Visual reference for the status tags and dashboard card colors used across the
// app. Pure documentation - it reuses the real .pill / .qrow classes so what's
// shown here is exactly what members and admins see in the wild.

function PrivateBadge() {
  return (
    <span className="pill private">
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ verticalAlign: "-1px", marginRight: 3 }}>
        <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      Private
    </span>
  );
}

const TAGS: { pill: React.ReactNode; when: string }[] = [
  {
    pill: <span className="pill pending">Pending approval</span>,
    when: "Custom quote awaiting Luna Creative's pricing/approval (status CUSTOM_PENDING).",
  },
  {
    pill: <span className="pill awaiting">Sent for signature</span>,
    when: "Sent out for signature, but no one has signed yet.",
  },
  {
    pill: <span className="pill awaiting">Awaiting signature</span>,
    when: "The member has signed; Luna Creative's counter-signature is still outstanding.",
  },
  {
    pill: <span className="pill signed">Signed</span>,
    when: "Signed by both parties - the proposal is complete.",
  },
  {
    pill: <span className="pill expired">Expired</span>,
    when: "Past its 60-day validity. Members can't open it or see its price; the public link 404s until an admin reactivates it.",
  },
  {
    pill: <PrivateBadge />,
    when: "Not shared - visible only to its creator and admins.",
  },
  {
    pill: <span className="pill gold">Pending approval</span>,
    when: "Solid-gold variant used on the quote detail header for a pending custom quote.",
  },
];

const CARDS: { cls: string; title: string; when: string }[] = [
  {
    cls: "qrow attention",
    title: "Needs attention / Awaiting Luna Creative",
    when: "Gold border. The top dashboard section - anything where the next move is Luna's (pending approval or awaiting Luna's signature).",
  },
  {
    cls: "qrow awaiting",
    title: "Awaiting signature / Sent for signature",
    when: "Gold border (same as attention). A proposal mid-signature-flow that isn't grouped into the top section.",
  },
  {
    cls: "qrow signed",
    title: "Signed",
    when: "Green border. Signed by both parties and complete.",
  },
  {
    cls: "qrow",
    title: "Default",
    when: "No accent border. A ready proposal with nothing outstanding.",
  },
];

export default async function UiReferencePage() {
  await requireAdmin();

  return (
    <div>
      <h1>UI reference</h1>
      <p className="lede">
        The status tags and dashboard card colors used across the app, with what each one means.
        This page reuses the live styles, so it always matches what members and admins actually see.
      </p>

      <h3 style={{ marginTop: 28, marginBottom: 12 }}>Status tags</h3>
      <div className="card">
        {TAGS.map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 0",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
            }}
          >
            <div style={{ flex: "none", minWidth: 150 }}>{t.pill}</div>
            <div className="help" style={{ margin: 0 }}>{t.when}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 28, marginBottom: 12 }}>Card colors</h3>
      <p className="help" style={{ marginTop: 0 }}>
        Dashboard rows carry a colored left border to signal state at a glance. Note that the
        attention and awaiting states share the same gold accent.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CARDS.map((c) => (
          <div key={c.cls} className={c.cls} style={{ cursor: "default" }}>
            <div className="main">
              <div className="name">{c.title}</div>
              <div className="meta">{c.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
