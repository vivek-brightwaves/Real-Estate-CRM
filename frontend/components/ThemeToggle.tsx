"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Avoid hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-12 h-12 rounded-full border border-slate-200/50 bg-white/40 dark:bg-slate-800/40" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-12 h-12 flex items-center justify-center rounded-full border border-[#E8EDF7] dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 text-slate-655 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#273449] hover:scale-105 active:scale-95 transition-all duration-300 relative group cursor-pointer shadow-sm hover:shadow focus:outline-none focus:ring-4 focus:ring-blue-600/10"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Theme Toggle Button"
    >
      <div className="relative w-6 h-6 overflow-hidden pointer-events-none">
        {/* Sun Icon */}
        <svg
          className={`w-6 h-6 absolute transition-all duration-500 transform ${
            isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
          />
        </svg>
        {/* Moon Icon */}
        <svg
          className={`w-6 h-6 absolute transition-all duration-500 transform ${
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>
      
      {/* Premium tooltips */}
      <span className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap pointer-events-none z-50">
        {isDark ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
