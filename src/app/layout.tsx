import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Droptine Pricing",
  description: "Website proposal pricing tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="brandbar">
          <div className="wrap">
            <span className="logo">
              DROP<span className="accent">TINE</span>
            </span>
            <span className="tag">Website Pricing · by Luna Creative</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
