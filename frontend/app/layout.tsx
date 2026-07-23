import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "./components/AppLayout";

export const metadata: Metadata = {
  title: "Real Estate CRM",
  description: "Next.js + FastAPI CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
