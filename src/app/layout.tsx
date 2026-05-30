import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { PwaInstaller } from "@/components/pwa-installer";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuackTrack V2 — Academic Scheduling Platform",
  description:
    "University scheduling and faculty workload management platform with automated schedule generation, conflict detection, and workload balancing.",
  keywords: [
    "QuackTrack",
    "scheduling",
    "academic",
    "university",
    "faculty",
    "timetable",
  ],
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "QuackTrack",
    statusBarStyle: "black-translucent",
    startupImage: ["/logo.jpg"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "QuackTrack",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#030304",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased font-body`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <PwaInstaller />
      </body>
    </html>
  );
}
