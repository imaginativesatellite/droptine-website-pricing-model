import { requireAdmin } from "@/lib/session";
import PricingPreview from "./PricingPreview";

export default async function PricingPreviewPage() {
  await requireAdmin();
  return <PricingPreview />;
}
