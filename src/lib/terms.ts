/**
 * Platform-use terms a MEMBER must accept before using the questionnaire
 * tool. Separate from the client-facing proposal Terms & Conditions in
 * proposal-copy.ts - these govern the Droptine member's use of this
 * internal platform, not the end client's relationship with Luna Creative.
 */

export const PLATFORM_TERMS_TITLE = "Platform Use Terms";

export const PLATFORM_TERMS_INTRO =
  "This platform is provided by Luna Creative LLC (\"Luna Creative\") to support Droptine's team in preparing website-build proposals for prospective clients. By accepting below, you (\"Member\") agree to the following terms:";

export const PLATFORM_TERMS_SECTIONS: { title: string; body: string }[] = [
  {
    title: "Good-Faith Use",
    body: "This platform is intended solely to prepare pricing and proposals for projects that Member genuinely intends to have built by Luna Creative. Member agrees not to use this platform to generate pricing or proposals for projects that will be built by another designer, developer, or agency, or for any purpose unrelated to a genuine Luna Creative engagement.",
  },
  {
    title: "Confidentiality of Pricing",
    body: "The pricing logic, rules, and figures shown on this platform are proprietary to Luna Creative and made available to Member solely to support the proposal process. Member agrees not to disclose this pricing methodology to any third party.",
  },
  {
    title: "Right of First Refusal",
    body: "Any proposal generated through this platform is prepared on Luna Creative's pricing and scoped to be built by Luna Creative. Before engaging any other designer, developer, or agency to perform the website-build work described in a proposal generated here, Member agrees to first offer Luna Creative a right of first refusal to perform that work on substantially the same terms.",
  },
];

export const PLATFORM_TERMS_ACCEPTANCE_LABEL =
  "I have read and agree to the terms above.";

/** Plain-text snapshot of the current terms, stored on the User row at acceptance time. */
export function platformTermsSnapshot(): string {
  return [
    PLATFORM_TERMS_TITLE,
    PLATFORM_TERMS_INTRO,
    ...PLATFORM_TERMS_SECTIONS.map((s) => `${s.title}\n${s.body}`),
  ].join("\n\n");
}
