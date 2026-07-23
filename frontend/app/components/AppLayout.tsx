"use client";

import { usePathname } from "next/navigation";
import ClientLayout from "./ClientLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page should not have the CRM sidebar/header
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return <ClientLayout>{children}</ClientLayout>;
}
