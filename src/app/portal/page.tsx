import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { readMarkup } from "@/lib/portal";
import PortalQuote from "./PortalQuote";

export default async function PortalHome() {
  const user = await requireUser();

  const [dbUser, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { markupWebsite: true, markupWebsiteIsPercent: true, markupMonthly: true, markupIncrement: true },
    }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const markup = readMarkup({
    website: dbUser?.markupWebsite,
    websiteIsPercent: dbUser?.markupWebsiteIsPercent,
    monthly: dbUser?.markupMonthly,
    increment: dbUser?.markupIncrement,
  });

  return <PortalQuote markup={markup} demandPct={settings?.adjustmentPct ?? 0} />;
}
