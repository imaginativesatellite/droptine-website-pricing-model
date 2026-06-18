export default function ProposalNotFound() {
  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <h1>Proposal not found</h1>
      <p className="lede">
        That link didn&apos;t match a proposal, or the quote is still pending. Please double-check the
        link you were sent.
      </p>
    </div>
  );
}
