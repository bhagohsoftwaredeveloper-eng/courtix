import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Courtix — Book any court",
    template: "%s · Courtix",
  },
  description:
    "Pickleball, badminton, basketball and golf courts across Davao, bookable by the hour. Real photos, real availability, confirmed in one tap.",
  openGraph: {
    title: "Courtix — Book any court",
    description:
      "Every sport, every court, one booking. Find and book courts by the hour across Davao del Norte and Davao del Sur.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${archivoBlack.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
