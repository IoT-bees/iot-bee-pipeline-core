import "./globals.css";
import type { Metadata } from "next";
import { AppThemeProvider } from "@/components/landing/LandingThemeProvider";
import { site, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Plataforma IoT para integradores en Latinoamérica | iot bees",
    template: "%s | iot bees",
  },
  description: site.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_419",
    url: "/",
    siteName: site.name,
    title: "Plataforma IoT para integradores en Latinoamérica | iot bees",
    description: site.description,
  },
  twitter: {
    card: "summary",
    title: "Plataforma IoT para integradores en Latinoamérica | iot bees",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
