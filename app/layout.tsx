import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Book of Sand",
  description: "An infinite book, generated one page at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
