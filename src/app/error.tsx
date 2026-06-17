"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1>Something went wrong</h1>
      <p className="lede">An unexpected error occurred. Your data is safe — please try again.</p>
      <button className="btn-primary" onClick={reset}>Try again</button>
    </div>
  );
}
