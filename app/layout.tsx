import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURA — Ритуал емоційної ясності",
  description:
    "Керований ритуал рефлексії з образами таро для ясності у стосунках.",
  applicationName: "AURA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AURA",
  },
  icons: {
    icon: [
      { url: "/icons/aura-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/aura-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/aura-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
