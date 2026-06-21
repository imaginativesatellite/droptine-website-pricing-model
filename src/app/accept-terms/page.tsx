import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/(app)/actions";
import {
  PLATFORM_TERMS_TITLE,
  PLATFORM_TERMS_INTRO,
  PLATFORM_TERMS_SECTIONS,
  PLATFORM_TERMS_ACCEPTANCE_LABEL,
} from "@/lib/terms";
import { acceptTerms } from "./actions";

export default async function AcceptTermsPage() {
  const user = await requireUser();
  if (user.role !== "MEMBER") redirect("/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { termsAcceptedAt: true },
  });
  if (dbUser?.termsAcceptedAt) redirect("/dashboard");

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <h1>{PLATFORM_TERMS_TITLE}</h1>
      <p className="lede">{PLATFORM_TERMS_INTRO}</p>

      <div className="card">
        {PLATFORM_TERMS_SECTIONS.map((s) => (
          <div key={s.title} style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 4 }}>{s.title}</h3>
            <p style={{ margin: 0 }}>{s.body}</p>
          </div>
        ))}

        <form action={acceptTerms} style={{ marginTop: 8 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" required style={{ width: "auto", marginTop: 3 }} />
            <span>{PLATFORM_TERMS_ACCEPTANCE_LABEL}</span>
          </label>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn-primary">Accept &amp; continue</button>
          </div>
        </form>
      </div>

      <form action={logout} style={{ marginTop: 12 }}>
        <button type="submit" className="backlink" style={{ background: "none", border: "none", cursor: "pointer" }}>
          Don&apos;t agree? Sign out
        </button>
      </form>
    </div>
  );
}
