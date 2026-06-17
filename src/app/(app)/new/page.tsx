import { requireUser } from "@/lib/session";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  await requireUser();
  return (
    <div className="container">
      <h1>New Quote</h1>
      <p className="lede">Answer the questions, then generate the proposal.</p>
      <NewQuoteForm />
    </div>
  );
}
