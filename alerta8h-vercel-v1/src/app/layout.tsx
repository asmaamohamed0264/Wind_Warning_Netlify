import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Monitor Vânt - Aleea Someșul Cald",
  description: "Sistem de monitorizare și alerte vânt pentru Aleea Someșul Cald, București. Prognoze în timp real și notificări personalizate.",
  keywords: "vânt, București, prognoză meteo, alerte vânt, Someșul Cald, monitorizare",
  authors: [{ name: "Bogdan pentru Loredana" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/wind-icon-192.png"
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    themeColor: "#0ea5e9"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}