import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { RecoveryCatcher } from "@/components/auth/recovery-catcher";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const description =
  "ViralForge analyse la mécanique des vidéos virales et réécrit tes scripts TikTok, Reels et Shorts pour retenir l'attention jusqu'à la dernière seconde.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ViralForge — Des scripts que personne ne swipe",
    template: "%s · ViralForge",
  },
  description,
  // Ajouté à l'écran d'accueil d'un iPhone, le site s'ouvre en plein écran.
  appleWebApp: {
    capable: true,
    title: "ViralForge",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "ViralForge — Des scripts que personne ne swipe",
    description,
    siteName: "ViralForge",
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  colorScheme: "dark",
  // Plein écran sur iPhone : les marges de sécurité (encoche, barre du bas)
  // sont gérées avec env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <RecoveryCatcher />
        {children}
      </body>
    </html>
  );
}
