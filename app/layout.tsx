import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === 'production' 
      ? 'https:/pst.e-coucou.com' 
      : 'http://localhost:3000'
  ),
  title: "PST-2026",
  description: "Tournoi Officiel de Pétanque - Résidence Paris Saint-Tropez",
  icons: {
    icon: "/icon.png?v=1", 
    apple: "/apple-icon.png?v=1",
    shortcut: "/icon.png?v=1",
  },
  openGraph: {
    title: "PST 2026 — Paris Saint-Tropez",
    description: "Suivez le live du tournoi. Et l'historique des années précédentes ...",
    url: "https://pst.e-coucou.com",
    siteName: "PST 2026",
    images: [
      {
        url: "/apple-icon.png?v=1", // Utilise ton joli logo pour le partage
        width: 800,
        height: 600,
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
		<Navbar /> {/* La Navbar sera au-dessus de tout */}
		<main className="w-full flex-grow">
          {children} {/* C'est ici que tes pages (tournois, etc.) s'afficheront */}
        </main>
        <Footer/>
      </body>
    </html>
  );
}
