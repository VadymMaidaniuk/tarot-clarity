import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";

// Inter is the cross-platform stand-in for SF Pro; Apple devices pick up the
// system font first via -apple-system in the font stack.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

// Applies a saved theme before first paint so the page never flashes the
// wrong scheme. "system" leaves the attribute off and defers to the media query.
const themeScript = `(function(){try{var t=localStorage.getItem("aura-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "AURA — Ясність у стосунках",
  description:
    "Керований ритуал рефлексії з образами таро для ясності у стосунках.",
  applicationName: "AURA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AURA",
  },
  icons: {
    icon: [
      { url: "/icons/aura-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/aura-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/aura-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
