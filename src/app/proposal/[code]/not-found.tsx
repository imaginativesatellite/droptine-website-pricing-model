import Link from "next/link";

export default function ProposalNotFound() {
  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <h1>Proposal not found</h1>
      <p className="lede">That access code didn&apos;t match a proposal, or the quote is still pending.</p>
      <Link href="/proposal" className="btn-primary">Try another code</Link>
    </div>
  );
}
