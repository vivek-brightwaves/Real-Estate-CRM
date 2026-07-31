import type { Metadata } from "next";
import "./globals.css";
import { FeedbackProvider } from "../components/ui/FeedbackProvider";

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
    <html lang="en" className="overflow-hidden h-screen">
      <body className="antialiased font-sans overflow-hidden h-screen">
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
