import { requireUser } from "@/lib/session";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  await requireUser();
  return (
    <div className="container">
      <h1>New quote</h1>
      <p className="lede">Answer the questions — the price updates live. Then generate the proposal.</p>
      <NewQuoteForm />
    </div>
  );
}
