import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import { SITE, SITE_LIVE } from "@/lib/seo";
import { Forum, Pinyon_Script, Montserrat } from "next/font/google";
import { BasketProvider } from "@/components/BasketProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { CookieConsent } from "@/components/CookieConsent";
import { HelpChat } from "@/components/HelpChat";
import { WelcomePopup } from "@/components/WelcomePopup";
import "./globals.css";

const serif = Forum({ subsets: ["latin"], weight: "400", variable: "--font-serif" });
const script = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-script" });
const sans = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Ivy & Bough",
  description: "Elegant, unique Christmas pieces for the table, the tree and the front door.",
  robots: { index: SITE_LIVE, follow: SITE_LIVE },
  openGraph: { type: "website", siteName: "Ivy & Bough", locale: "en_AU", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Ivy & Bough" }] },
  twitter: { card: "summary_large_image" },
  other: { "p:domain_verify": "e93d00004715bfb83af1d9e436427150" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${serif.variable} ${script.variable} ${sans.variable}`}>
      <body><BasketProvider><WishlistProvider>{children}</WishlistProvider></BasketProvider><CookieConsent /><WelcomePopup /><HelpChat /><Analytics /></body>
    </html>
  );
}
