import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tiruppur Order Tracker",
  description: "Production Order Tracking with TNA, Run-rate Projections, and Offline Outbox for Tiruppur Knitwear",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-textPrimary antialiased">
        {children}
      </body>
    </html>
  );
}
