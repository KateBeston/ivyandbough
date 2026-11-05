import type { Metadata } from "next";
import { Forum, Montserrat } from "next/font/google";
import { BasketProvider } from "@/components/BasketProvider";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

const serif = Forum({ subsets: ["latin"], weight: "400", variable: "--font-serif" });
const sans = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ivy & Bough",
  description: "Elegant, unique Christmas pieces for the table, the tree and the front door.",
  robots: { index: false, follow: false },
  other: { "p:domain_verify": "e93d00004715bfb83af1d9e436427150" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${serif.variable} ${sans.variable}`}>
      <body><BasketProvider>{children}</BasketProvider><CookieConsent /></body>
    </html>
  );
}
