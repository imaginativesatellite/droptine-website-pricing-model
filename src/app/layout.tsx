import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Droptine Pricing",
  description: "Website proposal pricing tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
