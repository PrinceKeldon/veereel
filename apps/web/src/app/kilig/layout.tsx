import type { Metadata } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import { IntroSplash } from "@/components/IntroSplash";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const SITE_NAME = "Kilig";
const SITE_DESCRIPTION =
  "Vertical micro-drama, curated for the in-between moments — the commute, the queue, the five minutes you've got.";

export const metadata: Metadata = {
  title: {
    default: "Kilig — find your next obsession",
    template: "%s · Kilig",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function KiligLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${oswald.variable} ${inter.variable} ${jetbrainsMono.variable} min-h-screen`}
    >
      <IntroSplash />
      {children}
    </div>
  );
}
