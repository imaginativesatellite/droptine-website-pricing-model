import { requireAdmin } from "@/lib/session";
import { PRICING_RULES as R } from "@/lib/pricing";
import {
  ECOMMERCE_MONTHLY_DISCLAIMER,
  IDX_MONTHLY_DISCLAIMER,
} from "@/lib/proposal-copy";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <table className="simple">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i}>
            <td>{k}</td>
            <td className="amt">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

export default async function PricingRulesPage() {
  await requireAdmin();

  const pageRows: [string, string][] = Object.entries(R.pageBase).map(([k, v]) => [`${k} pages`, money(v)]);
  pageRows.push(["30+ pages", "Custom quote"]);

  const ecomRows: [string, string][] = [["Being an e-commerce store", money(R.ecommerceBaseFee)]];
  Object.entries(R.ecommerceItemTiers).forEach(([k, v]) => ecomRows.push([`${k} items`, `+ ${money(v)}`]));
  ecomRows.push(["150+ items", "Custom quote"]);
  ecomRows.push(["Built on Shopify", `+ ${money(R.ecommerceShopifySurcharge)}`]);

  const animalRows: [string, string][] = [["Listing page (animals or pedigree)", money(R.listingPageFee)]];
  Object.entries(R.individualPageTiers).forEach(([k, v]) => animalRows.push([`Individual pages, ${k}`, `+ ${money(v)}`]));
  animalRows.push(["60+ animals/pedigrees", "Custom quote"]);

  return (
    <div className="container">
      <h1>Pricing Rules</h1>
      <p className="lede">Every rule the calculator applies, and the disclaimers added to proposals.</p>

      <Card title="Base build (by page count)">
        <p className="help" style={{ marginBottom: 10 }}>
          Page count sets the base price. Rounded up to the nearest {money(R.roundUpTo)}; clamped to {money(R.min)}–{money(R.max)}.
        </p>
        <Rows rows={pageRows} />
      </Card>

      <Card title="E-commerce">
        <p className="help" style={{ marginBottom: 10 }}>Priced by store cost instead of page count.</p>
        <Rows rows={ecomRows} />
      </Card>

      <Card title="Animals & pedigrees">
        <Rows rows={animalRows} />
      </Card>

      <Card title="Other add-ons">
        <Rows
          rows={[
            ["Real-estate package (listings + agent logins + map)", `+ ${money(R.realEstatePackage)}`],
            ["Social media feed integration", `+ ${money(R.socialFeedFee)}`],
            ["Blog", `+ ${money(R.contentPage)}`],
            ["News", `+ ${money(R.contentPage)}`],
            ["Events", `+ ${money(R.contentPage)}`],
            ["Entrance animations", `+ ${money(R.animationTiers["entrance"])}`],
            ["Entrance & interactive animations", `+ ${money(R.animationTiers["entrance-interactive"])}`],
            ["MLS/IDX syncing (one-time build)", `+ ${money(R.mlsBuildAdd)}`],
            ["Structure & content provided by Droptine", `− ${money(R.contentProvidedReduction)} (floor ${money(R.minContentProvided)})`],
          ]}
        />
      </Card>

      <Card title="Monthly hosting, security & maintenance">
        <Rows
          rows={[
            ["Standard", `${money(R.monthlyBase)}/mo`],
            ["E-commerce / real-estate / MLS / complex", `${money(R.monthlyBase + R.monthlySurcharge)}/mo`],
          ]}
        />
      </Card>

      <Card title="Routes to a custom quote">
        <ul style={{ marginLeft: 18, fontSize: "0.92rem" }}>
          <li>30+ pages</li>
          <li>150+ store items</li>
          <li>60+ animals or pedigrees with individual pages</li>
          <li>MLS/IDX adds $930 + the IDX disclaimer (not a custom quote)</li>
          <li>Any free-text in &ldquo;other / complex functionality&rdquo;</li>
        </ul>
      </Card>

      <Card title="Conditional disclaimers (only shown when triggered)">
        <p className="help" style={{ marginBottom: 12 }}>
          Standard features, lead time, the validity notice, and the general terms appear on every
          proposal. The ones below only appear when their trigger is met:
        </p>
        <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <strong>E-commerce (monthly):</strong> {ECOMMERCE_MONTHLY_DISCLAIMER}
            <div className="help" style={{ marginTop: 2 }}>Trigger: the site includes e-commerce.</div>
          </div>
          <div>
            <strong>MLS/IDX (monthly):</strong> {IDX_MONTHLY_DISCLAIMER}
            <div className="help" style={{ marginTop: 2 }}>Trigger: MLS/IDX syncing is selected.</div>
          </div>
          <div>
            <strong>Custom disclaimer:</strong> A free-text note an admin can add when approving or
            editing a quote, placed on either the website-price or monthly section.
            <div className="help" style={{ marginTop: 2 }}>Trigger: an admin adds one to the quote.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
