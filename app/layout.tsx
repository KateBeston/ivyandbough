import type { Metadata } from "next";
import { Italiana, Montserrat } from "next/font/google";
import "./globals.css";

const serif = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-serif" });
const sans = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ivy & Bough",
  description: "Elegant, unique Christmas pieces for the table, the tree and the front door.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
