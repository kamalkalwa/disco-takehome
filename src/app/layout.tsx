import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Disco — Campaign Drafter",
  description: "Describe your business, get a draft ad campaign.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
