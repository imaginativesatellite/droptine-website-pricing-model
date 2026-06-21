import { requireAdmin } from "@/lib/session";
import TestChecklist from "./TestChecklist";

export default async function TestsPage() {
  await requireAdmin();

  return (
    <div className="container">
      <h1>Tests</h1>
      <p className="lede">
        Work through these scenarios to confirm everything works end-to-end. Your checkmarks are
        saved on this device, so you can pick up where you left off.
      </p>
      <TestChecklist />
    </div>
  );
}
