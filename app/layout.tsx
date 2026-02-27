import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agency Platform",
  description: "WhatsApp CRM & Voice AI campaign manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
