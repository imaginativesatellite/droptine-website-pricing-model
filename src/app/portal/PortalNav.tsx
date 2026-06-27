import Link from "next/link";
import { LogOut } from "lucide-react";
import BrandMark from "@/components/BrandMark";

/**
 * Presentation Mode header. Orange instead of the usual charcoal, with the logo
 * and wordmark in white, so it's unmistakable to the operator that they're in
 * the client-facing view. The only control is the exit, which leads to the PIN.
 */
export default function PortalNav() {
  return (
    <nav className="portalnav">
      <div className="wrap">
        <span className="brandlink">
          <BrandMark className="brandmark" />
          <span className="brandword"><strong>Droptine</strong></span>
        </span>
        <span className="spacer" />
        <Link href="/portal/exit" className="exit" aria-label="Exit Presentation Mode" title="Exit Presentation Mode">
          <LogOut size={20} aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
