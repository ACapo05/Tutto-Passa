import type { Metadata, Viewport } from "next";
import { Figtree, Newsreader } from "next/font/google";
import "./globals.css";
import { CHOICES, toView } from "@/lib/languages";
import { currentProfile } from "@/lib/current-language";
import { LanguageProvider } from "@/components/language";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Tutto Passa",
  description: "Ten minutes of spoken practice a day, with someone who never corrects you to your face.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tutto Passa" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ec",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = toView(await currentProfile());
  return (
    <html lang="en">
      <body className={`${figtree.variable} ${newsreader.variable} font-sans`}>
        <LanguageProvider value={{ language, choices: CHOICES }}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
