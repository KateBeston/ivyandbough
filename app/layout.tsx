import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import { SITE, SITE_LIVE } from "@/lib/seo";
import { Forum, Montserrat } from "next/font/google";
import { BasketProvider } from "@/components/BasketProvider";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

const serif = Forum({ subsets: ["latin"], weight: "400", variable: "--font-serif" });
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
    <html lang="en-AU" className={`${serif.variable} ${sans.variable}`}>
      {/* Temporary, for checking the tag before launch. It ignores cookie consent, so it must be off at launch. */}
      {process.env.NEXT_PUBLIC_GTM_TEST === "true" && process.env.NEXT_PUBLIC_GTM_ID && (
        <head>
          <script id="gtm" async src={`https://www.googletagmanager.com/gtm.js?id=${process.env.NEXT_PUBLIC_GTM_ID}`} />
          <script dangerouslySetInnerHTML={{ __html: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});" }} />
        </head>
      )}
      <body><BasketProvider>{children}</BasketProvider><CookieConsent /><Analytics /></body>
    </html>
  );
}
