"use client";

import React from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  percentage: string | number;
  isPositive: boolean;
  color: "blue" | "green" | "purple" | "orange";
  icon: React.ReactNode;
}

// Compact number formatting helper matching Indian numbering system and international notation
const formatNumber = (num: number, prefix: string = ""): string => {
  const isIndian = prefix.includes("₹") || prefix.toLowerCase().includes("inr");
  if (isIndian) {
    if (num >= 10000000) {
      return `${(num / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
    }
    if (num >= 100000) {
      return `${(num / 100000).toFixed(2).replace(/\.?0+$/, '')} L`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2).replace(/\.?0+$/, '')}K`;
    }
  } else {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2).replace(/\.?0+$/, '')}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2).replace(/\.?0+$/, '')}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2).replace(/\.?0+$/, '')}K`;
    }
  }
  return num.toLocaleString('en-US');
};

const formatLargeValue = (val: string | number, label: string): string => {
  const str = String(val);
  const cleanStr = str.replace(/,/g, '');
  const numericMatch = cleanStr.match(/[\d.]+/);
  if (!numericMatch) return str;

  const numVal = parseFloat(numericMatch[0]);

  // Clean indices and substrings on the clean comma-stripped string to avoid index mismatch offsets
  const numberStr = numericMatch[0];
  const numberIndex = cleanStr.indexOf(numberStr);
  const prefix = cleanStr.substring(0, numberIndex);
  const remainder = cleanStr.substring(numberIndex + numberStr.length);

  const remainderClean = remainder.replace(/\s+/g, "");
  const hasSuffix = /^(Cr|L|K|M|B)$/i.test(remainderClean);
  if (hasSuffix) return str;

  const isCurrency = cleanStr.includes("₹") || 
                     label.toLowerCase().includes("revenue") || 
                     label.toLowerCase().includes("sales") || 
                     label.toLowerCase().includes("collection") || 
                     label.toLowerCase().includes("payment") || 
                     label.toLowerCase().includes("price") || 
                     label.toLowerCase().includes("amount");

  const finalPrefix = isCurrency ? "₹" : prefix;
  const finalSuffix = hasSuffix ? "" : remainder;

  return `${finalPrefix}${formatNumber(numVal, finalPrefix)}${finalSuffix}`;
};

export default function KPICard({ label, value, percentage, isPositive, color, icon }: KPICardProps) {
  const themes = {
    blue: {
      border: "border-l-4 border-l-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
      badge: "bg-blue-50 dark:bg-blue-955/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
      accent: "text-blue-600 dark:text-blue-450",
    },
    green: {
      border: "border-l-4 border-l-green-500",
      iconBg: "bg-green-50 dark:bg-emerald-955/50 text-green-600 dark:text-emerald-400",
      badge: "bg-green-50 dark:bg-emerald-955/30 text-green-700 dark:text-emerald-400 border-green-100 dark:border-emerald-900/30",
      accent: "text-green-600 dark:text-emerald-450",
    },
    purple: {
      border: "border-l-4 border-l-purple-500",
      iconBg: "bg-purple-50 dark:bg-purple-955/50 text-purple-600 dark:text-purple-400",
      badge: "bg-purple-50 dark:bg-purple-955/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
      accent: "text-purple-600 dark:text-purple-450",
    },
    orange: {
      border: "border-l-4 border-l-orange-500",
      iconBg: "bg-orange-50 dark:bg-orange-955/50 text-orange-600 dark:text-orange-400",
      badge: "bg-orange-50 dark:bg-orange-955/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
      accent: "text-orange-600 dark:text-orange-450",
    },
  };

  const currentTheme = themes[color] || themes.blue;
  const formattedValue = formatLargeValue(value, label);

  // Determine dynamic font size based on length of formattedValue to prevent overflows
  let fontSize = "clamp(1.8rem, 3.2vw, 2.25rem)";
  const valLength = String(formattedValue).length;
  if (valLength >= 12) {
    fontSize = "clamp(1.3rem, 2.2vw, 1.6rem)";
  } else if (valLength >= 10) {
    fontSize = "clamp(1.5rem, 2.6vw, 1.85rem)";
  } else if (valLength >= 8) {
    fontSize = "clamp(1.7rem, 2.8vw, 2rem)";
  }

  return (
    <div 
      className={`bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200/80 dark:border-[#334155] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex justify-between items-start ${currentTheme.border}`}
      title={`Metric value: ${value}`}
    >
      <div className="space-y-3 flex-1 min-w-0 pr-2">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <h3 
          className="font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight"
          style={{ 
            fontSize, 
            whiteSpace: 'nowrap',
          }}
          title={`Full value: ${value}`}
        >
          {formattedValue}
        </h3>
        
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
            isPositive 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30" 
              : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-900/30"
          }`}>
            <span className="text-xs">{isPositive ? "↑" : "↓"}</span>
            {percentage}%
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">vs last month</span>
        </div>
      </div>

      <div className={`p-3 rounded-xl shadow-sm ${currentTheme.iconBg} shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
