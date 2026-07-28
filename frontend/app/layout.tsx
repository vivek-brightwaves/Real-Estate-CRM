import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "../components/theme-provider";

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
    <html lang="en" className="overflow-hidden h-screen" suppressHydrationWarning>
      <body className="antialiased font-sans overflow-hidden h-screen bg-[#f8fbff] dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="crm-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
