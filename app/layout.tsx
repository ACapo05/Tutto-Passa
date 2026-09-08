import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Archivo, Archivo_Narrow } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const archivoNarrow = Archivo_Narrow({ subsets: ["latin"], variable: "--font-archivo-narrow", display: "swap" });

export const metadata: Metadata = {
  title: "Tutto Passa",
  description: "Dieci minuti di conversazione al giorno.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Tutto Passa" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#232e27",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${bodoni.variable} ${archivo.variable} ${archivoNarrow.variable}`}>
        {children}
      </body>
    </html>
  );
}
