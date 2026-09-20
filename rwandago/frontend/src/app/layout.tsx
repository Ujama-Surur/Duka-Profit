import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/common/Header";
import { Footer } from "../components/common/Footer";

export const metadata: Metadata = {
  title: "RwandaGo 🇷🇼 — Discover Rwanda | Travel, Stay, Explore & Plan",
  description:
    "Plan your stay, discover breathtaking national parks, encounter mountain gorillas, book hotels, and plan your authentic Rwanda journey.",
  keywords: [
    "Rwanda travel",
    "Visit Rwanda",
    "Gorilla trekking",
    "Kigali hotels",
    "Akagera safari",
    "Lake Kivu",
    "Nyungwe canopy walk",
    "Rwanda tour guide",
  ],
  openGraph: {
    title: "RwandaGo — Discover Rwanda. Your way.",
    description: "Stay. Explore. Experience Rwanda.",
    url: "https://rwandago.rw",
    siteName: "RwandaGo",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#FDFBF7] text-gray-900">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
