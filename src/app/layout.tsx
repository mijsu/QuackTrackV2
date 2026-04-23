import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuackTrack | Pateros Technological College - Intelligent Timetable Management",
  description: "Intelligent timetable management system for Pateros Technological College. Automate schedule generation, manage faculty loads, and optimize academic scheduling.",
  keywords: ["QuackTrack", "PTC", "Pateros Technological College", "Scheduling", "Academic", "Faculty Management", "Timetable"],
  authors: [{ name: "PTC IT Department" }],
  icons: {
    icon: "/ptc-app-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
