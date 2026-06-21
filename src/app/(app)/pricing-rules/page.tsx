import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PRICING_RULES as R } from "@/lib/pricing";
import {
  ECOMMERCE_MONTHLY_DISCLAIMER,
  IDX_MONTHLY_DISCLAIMER,
} from "@/lib/proposal-copy";
import DemandAdjustmentForm from "./DemandAdjustmentForm";

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

  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });

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

      <Card title="Demand adjustment">
        <DemandAdjustmentForm initialPct={settings?.adjustmentPct ?? 0} />
      </Card>

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

      <Card title="Scope summary paragraph">
        <p className="help" style={{ marginBottom: 10 }}>
          The plain-English &ldquo;what we&rsquo;ll build&rdquo; paragraph on every proposal. It&rsquo;s
          always built from the answers — never from the price, and the price is never built from it.
        </p>
        <p style={{ fontSize: "0.92rem", marginBottom: 6 }}>
          <strong>Scope phrases, included only when their trigger is met:</strong>
        </p>
        <ul style={{ marginLeft: 18, fontSize: "0.92rem", marginBottom: 14 }}>
          <li>Not e-commerce → &ldquo;a [page tier]-page website&rdquo; (uses the exact page count typed in instead of the literal &ldquo;30+&rdquo; when that follow-up was answered)</li>
          <li>E-commerce → &ldquo;an online store[ on Shopify] ([item count] items)&rdquo;</li>
          <li>Animals page → individual animal pages (with count) if each animal gets its own page, otherwise a single animal listing page</li>
          <li>Pedigree page → individual pedigree pages (with count) if each gets its own page, otherwise a single pedigree page</li>
          <li>Real-estate package → &ldquo;a real-estate package (property listings, agent logins, interactive property map)&rdquo;</li>
          <li>Blog, news, events → one phrase each, only if selected</li>
          <li>Social media feed integration → one phrase, only if selected</li>
          <li>Animations → &ldquo;entrance animations&rdquo; or &ldquo;entrance &amp; interactive animations&rdquo;, only if selected</li>
          <li>MLS/IDX syncing → &ldquo;live MLS/IDX real-estate syncing&rdquo;</li>
          <li>Structure &amp; content provided by Droptine → one phrase, only if selected</li>
          <li>Custom functionality → &ldquo;custom functionality: their answer&rdquo;, only if answered</li>
        </ul>
        <p className="help" style={{ marginBottom: 10 }}>
          The existing-website question and its URL are context only — they describe a site being
          replaced, not something being built — so they&rsquo;re never part of this paragraph.
        </p>
        <p style={{ fontSize: "0.92rem", marginBottom: 6 }}>
          <strong>Two ways that list becomes a paragraph:</strong>
        </p>
        <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <strong>Default template (no AI, no cost):</strong> one fixed sentence introducing Luna
            Creative and the standard feature set, plus a &ldquo;This includes &hellip;&rdquo; sentence
            listing the scope phrases above, comma-separated.
            <div className="help" style={{ marginTop: 2 }}>Used whenever AI scope-writing is off.</div>
          </div>
          <div>
            <strong>AI-drafted:</strong> Claude is given the same scope list plus the client name and
            industry, and writes 2&ndash;3 short paragraphs. It&rsquo;s explicitly instructed to never
            mention prices, hours, or dollar amounts. If the call fails or returns nothing, the default
            template above is used instead.
            <div className="help" style={{ marginTop: 2 }}>Trigger: ENABLE_AI=true and an Anthropic API key are both set.</div>
          </div>
        </div>
      </Card>

      <Card title="Conditional disclaimers (only shown when triggered)">
        <p className="help" style={{ marginBottom: 12 }}>
          Standard features, lead time, the validity notice, and the general terms appear on every
          proposal. The ones below only appear when their trigger is met:
        </p>
        <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <strong>E-commerce (monthly):</strong> {ECOMMERCE_MONTHLY_DISCLAIMER}
            <div className="help" style={{ marginTop: 2, fontStyle: "italic" }}>Trigger: the site includes e-commerce.</div>
          </div>
          <div>
            <strong>MLS/IDX (monthly):</strong> {IDX_MONTHLY_DISCLAIMER}
            <div className="help" style={{ marginTop: 2, fontStyle: "italic" }}>Trigger: MLS/IDX syncing is selected.</div>
          </div>
          <div>
            <strong>Custom disclaimer:</strong> A free-text note an admin can add when approving or
            editing a quote, placed on either the website-price or monthly section.
            <div className="help" style={{ marginTop: 2, fontStyle: "italic" }}>Trigger: an admin adds one to the quote.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
