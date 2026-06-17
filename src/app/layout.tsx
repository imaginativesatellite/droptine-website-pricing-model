import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Droptine Web Pricing",
  description: "Website proposal pricing tool",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
