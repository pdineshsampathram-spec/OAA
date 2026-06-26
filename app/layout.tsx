import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAA — Overall Academic Analysis Platform",
  description: "Next-generation AI-powered student analytics platform. Composite scoring across academics, skills, and projects with real-time leaderboards and behavioral insights.",
  keywords: "student analytics, academic scoring, OAA, education technology, AI insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
