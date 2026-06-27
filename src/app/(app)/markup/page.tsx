import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canUseClientPortal, readMarkup } from "@/lib/portal";
import MarkupForm from "./MarkupForm";

export default async function MarkupPage() {
  const user = await requireUser();
  if (!canUseClientPortal(user)) redirect("/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      markupWebsite: true,
      markupWebsiteIsPercent: true,
      markupMonthly: true,
      markupIncrement: true,
    },
  });

  const markup = readMarkup({
    website: dbUser?.markupWebsite,
    websiteIsPercent: dbUser?.markupWebsiteIsPercent,
    monthly: dbUser?.markupMonthly,
    increment: dbUser?.markupIncrement,
  });

  return (
    <div className="container">
      <h1 style={{ marginBottom: 8 }}>Markup</h1>
      <p className="help" style={{ marginBottom: 20 }}>
        These settings control the price your clients see in Presentation Mode. Luna
        Creative&rsquo;s price is calculated first, then your markup is added on top.
        Clients never see this page or how the price is built.
      </p>
      <MarkupForm markup={markup} />
    </div>
  );
}
