# Droptine Pricing Model

Internal tool for Luna Creative and Droptine members to generate Webflow website
proposals for Droptine's clients. Members answer a short questionnaire; the app produces
a single, deterministic price (within Luna's historical $4k–$10k range), a branded
PDF, and a private code-protected proposal page. Complex/"additional functionality"
requests route to a custom quote instead.

## Stack
- **Next.js** (App Router, TypeScript)
- **Railway** hosting + **Railway Postgres**
- **Prisma** ORM
- **Auth.js / NextAuth** (email + password, individual accounts; MEMBER/ADMIN roles)
- **Resend** for email
- **Anthropic** for proposal prose only (the price is always computed in code)
- **@react-pdf/renderer** for the PDF

## Pricing
The engine lives in `src/lib/pricing.ts` and is derived from past Luna quotes,
tuned against the historical sample. Page count sets the base directly (rounded
**up** to the nearest **$250**, clamped to **$4,000–$15,000**): 1–4 = $4,000,
5–9 = $5,000, 10–14 = $7,000, 15–19 = $8,000, 20–24 = $9,000, 25–29 = $10,000,
30+ = custom. **E-commerce** sites are priced by store cost (not pages): $1k first
25 items, +$250 per 25, +$1k if Shopify. **Animal & pedigree pages:** $250 listing
fee each, +$500 per 10 for individual pages. **Real-estate bundle** +$2.5k.
**Social feed** +$100. **MLS** +$930 build & +$50/mo. **Blog/News/Events** +$500
each. **Droptine-provided content** −$500 ($3,500 floor). Monthly $169, +$50 for
e-commerce/real-estate/MLS/complex. 150+ store items, 60+ animals/pedigrees, 30+
pages, and any free-text custom request route to a **custom quote**. The
questionnaire is in `src/lib/questionnaire.ts` (with conditional follow-ups).

---

## Local setup
```bash
npm install
cp .env.example .env   # fill in values
npm run db:migrate     # apply migrations (creates tables)
npm run db:seed        # create the first admin
npm run dev
```

---

## Getting the secrets (one-time)

### 1. Anthropic API key — new vs. reuse?
**Recommendation: create a NEW key dedicated to this project.** A separate key lets
you set its own spend limit, see this project's usage in isolation, and revoke/rotate
it without breaking your other project. In the Anthropic Console → **API keys** →
**Create key** (name it "Droptine Pricing"), then set a monthly spend limit under
**Limits**. Paste it into Railway as `ANTHROPIC_API_KEY`.

### 2. Resend API key (not yet created)
1. Go to **https://resend.com** and sign up (use a Luna Creative email).
2. In the dashboard, open **API Keys** → **Create API Key**.
3. Name it "Droptine Pricing", permission **Full access** (or Sending access), and
   **Create**.
4. Copy the key (starts with `re_`) — it's shown only once. Paste it into Railway as
   `RESEND_API_KEY`. (Don't paste it in chat; add it directly in Railway → Variables.)

### 3. Sending domain — `notifications.luna-creative.com`
This subdomain was used in another project, so it likely needs to be re-verified for
**Resend** specifically (each email provider needs its own DNS records).
1. In Resend → **Domains** → **Add Domain** → enter `notifications.luna-creative.com`.
2. Resend shows DNS records to add (an MX record for the return path, plus TXT
   records for **SPF**, **DKIM**, and optionally **DMARC**).
3. Log in to wherever `luna-creative.com` DNS is hosted (GoDaddy, Cloudflare, etc.)
   and add each record exactly as shown. Note: if an **SPF** TXT record already exists
   on that subdomain from the old provider, **merge** the entries into one record
   rather than adding a second SPF record.
4. Back in Resend, click **Verify**. Once green, set
   `EMAIL_FROM="Luna Creative <proposals@notifications.luna-creative.com>"`.

> If you tell me which DNS host manages `luna-creative.com`, I can give you the exact
> click-path for that provider.

### 4. Auth secret
```bash
openssl rand -base64 32   # paste output into AUTH_SECRET
```

---

## Deploy to Railway
1. Create a Railway project, add the **Postgres** plugin (sets `DATABASE_URL`).
2. Add this repo as a service (connect GitHub → this repo/branch).
3. Add the env vars from `.env.example` under the service's **Variables**.
4. Railway builds with `npm run build` and serves with `npm start`.
5. After first deploy, run the seed once (Railway shell): `npm run db:seed`.

## Email behavior (per spec)
- **Proposal email → always the logged-in member** (PDF + code link).
- **Admins (`ADMIN_EMAILS`) get an email on EVERY quote request** — proposal or custom.
- **Custom-functionality requests** → no auto proposal; admins are notified to follow up.

## Admin
Admins can edit any saved proposal (rename, override the total, edit notes, change
answers), regenerate the PDF, and re-send. Every edit is recorded in `QuoteEdit`
(original auto price vs. manual edits, and who changed what).
