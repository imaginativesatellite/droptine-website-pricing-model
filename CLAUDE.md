# Droptine Pricing Model — project context

## What this is
Internal tool that turns a short member questionnaire into a deterministic
website-build price, a branded PDF, and a private code-protected proposal
page. Complex/custom requests route to an admin-approved custom quote
instead of an automatic price.

## The relationship
- **Luna Creative** owns and operates this tool.
- **Droptine** is Luna's reseller/partner — Droptine's team sells Luna's
  Webflow builds to their own ranch/hunting/breeder clients and uses this
  tool to generate those clients' proposals.
- **MEMBER** accounts = Droptine's team. They run the questionnaire and
  generate proposals day-to-day. They do not see pricing internals beyond
  the breakdown on their own proposals. (The role enum was renamed from
  `STAFF` to `MEMBER` — see the migration that runs `ALTER TYPE "Role"
  RENAME VALUE`.)
- **ADMIN** accounts = Luna Creative. Admins approve custom quotes, can
  override any price, edit the pricing rules, and can see every quote
  (including ones a member marked private).

## Hard rule: a new/changed questionnaire question always touches 3 places
Adding or changing a question is never just a `questionnaire.ts` edit.
Every question that affects price needs matching changes in:
1. **`src/lib/pricing.ts`** — add the field to `PricingAnswers`, and add the
   actual pricing logic in `computeQuote` (line item amount, and a
   custom-quote trigger if the option should route to a custom quote).
2. **`src/app/(app)/pricing-rules/page.tsx`** — the admin-facing page that
   documents what the calculator charges and why. It must stay accurate, or
   admins will be looking at stale rules.
3. **`src/lib/anthropic.ts` (`describeScope`)** — only if the new option
   should be mentioned in the AI-drafted scope prose. Skip if it's purely
   pricing with no prose impact.

Never ship a questionnaire question with no corresponding pricing rule, and
never add a pricing rule with no way to trigger it from the questionnaire.

## Pricing engine
- `src/lib/pricing.ts` is the single source of truth for price. It is fully
  deterministic — no AI involvement, ever.
- AI (`src/lib/anthropic.ts`, Anthropic SDK) is opt-in and writes **prose
  only**, never a price. Two independent env gates:
  - `ENABLE_AI` — proposal scope-summary prose (used on every proposal).
  - `ENABLE_AI_PRICING` — the admin "AI price recommendation" button shown
    only on pending custom quotes.
  Both default off and both require `ANTHROPIC_API_KEY`.

## Git workflow (read this — it ends the recurring "Unverified" nag)
- Commit and push directly to `main` — no PR workflow on this repo unless
  explicitly asked for one.
- Sessions run on a harness branch (e.g. `claude/…`). After committing, push
  **HEAD to both** so the branch's upstream never drifts behind `main`:
  ```
  git push origin HEAD:main          # the real target
  git push origin HEAD               # keep the harness branch in sync
  ```
  If only `main` is pushed, the stop-hook (`stop-hook-git-check.sh`) compares
  HEAD against the *harness* branch's upstream, sees the commits as "unpushed /
  Unverified", and re-fires that warning every turn. Pushing to both makes
  `origin/<harness-branch> == HEAD`, the comparison range is empty, and the
  warning stops.
- The "Unverified" / `%G? = N` part of that warning is a **false positive in
  this container**: commits *are* SSH-signed with the correct committer
  (`Claude <noreply@anthropic.com>`), but git can't verify them locally because
  no `gpg.ssh.allowedSignersFile` is configured. GitHub verifies against the
  registered key and shows them as Verified. **Do not** "fix" it with
  `git commit --amend --reset-author` or a force-push to `main` — that rewrites
  already-pushed history for no benefit.

## UI conventions
- **Dropdowns**: always use `src/components/BrandSelect.tsx`, never a raw
  `<select>`. It carries a hidden native `<select name=…>` so it still submits
  inside a plain/server-action form — pass `name` for those cases.
- Brand palette lives as CSS custom properties at the top of
  `src/app/globals.css` (`--charcoal`, `--ink`, `--gold`, `--gold-dark`,
  `--bg`, `--card`, `--line`, `--muted`, `--good`). Reuse these instead of
  hard-coding new colors.

## Other conventions
- Quotes expire 60 days after `validFrom`. Admins can reactivate an expired
  quote, which mints a fresh public link and refreshes pricing if the model
  changed since it was created.
- Visibility: member-created quotes default to shared (visible to all members +
  admins); admin-created quotes default to private. Either role can toggle
  `shared` on a quote they can see.
