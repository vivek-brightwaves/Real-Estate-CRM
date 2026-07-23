"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

let adminLayoutMounted = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(adminLayoutMounted);

  useEffect(() => {
    adminLayoutMounted = true;
    setMounted(true);
    if (!accessToken) {
      router.push("/login");
    } else if (user && user.role !== "SUPER_ADMIN") {
      router.push("/");
    }
  }, [accessToken, user, router]);

  if (!mounted || !accessToken || (user && user.role !== "SUPER_ADMIN")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
