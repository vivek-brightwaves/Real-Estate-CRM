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
      return `${(num / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    }
    if (num >= 100000) {
      return `${(num / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
  } else {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
  }
  return num.toLocaleString('en-US');
};

const formatLargeValue = (val: string | number, label: string): string => {
  const str = String(val);
  const numericMatch = str.replace(/,/g, '').match(/[\d.]+/);
  if (!numericMatch) return str;

  const numVal = parseFloat(numericMatch[0]);

  // Check if it already has compact suffix letters to avoid duplicate formatting
  const remainder = str.substring(str.indexOf(numericMatch[0]) + numericMatch[0].length);
  const remainderClean = remainder.replace(/\s+/g, "");
  const hasSuffix = /^(Cr|L|K|M|B)$/i.test(remainderClean);
  if (hasSuffix) return str;

  const isCurrency = str.includes("₹") || 
                     label.toLowerCase().includes("revenue") || 
                     label.toLowerCase().includes("sales") || 
                     label.toLowerCase().includes("collection") || 
                     label.toLowerCase().includes("payment") || 
                     label.toLowerCase().includes("price") || 
                     label.toLowerCase().includes("amount");

  const prefix = isCurrency ? "₹" : str.substring(0, str.indexOf(numericMatch[0]));
  const suffix = remainder;

  return `${prefix}${formatNumber(numVal, prefix)}${suffix}`;
};

export default function KPICard({ label, value, percentage, isPositive, color, icon }: KPICardProps) {
  const themes = {
    blue: {
      border: "border-l-4 border-l-blue-500",
      iconBg: "bg-blue-50 text-blue-600",
      badge: "bg-blue-50 text-blue-700 border-blue-100",
      accent: "text-blue-600",
    },
    green: {
      border: "border-l-4 border-l-green-500",
      iconBg: "bg-green-50 text-green-600",
      badge: "bg-green-50 text-green-700 border-green-100",
      accent: "text-green-600",
    },
    purple: {
      border: "border-l-4 border-l-purple-500",
      iconBg: "bg-purple-50 text-purple-600",
      badge: "bg-purple-50 text-purple-700 border-purple-100",
      accent: "text-purple-600",
    },
    orange: {
      border: "border-l-4 border-l-orange-500",
      iconBg: "bg-orange-50 text-orange-600",
      badge: "bg-orange-50 text-orange-700 border-orange-100",
      accent: "text-orange-600",
    },
  };

  const currentTheme = themes[color] || themes.blue;
  const formattedValue = formatLargeValue(value, label);

  return (
    <div 
      className={`bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex justify-between items-start ${currentTheme.border}`}
      title={`Metric value: ${value}`}
    >
      <div className="space-y-3 flex-1 min-w-0 pr-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <h3 
          className="font-extrabold text-slate-900 tracking-tight"
          style={{ 
            fontSize: 'clamp(1.75rem, 3.2vw, 2.25rem)', 
            whiteSpace: 'nowrap',
          }}
          title={`Full value: ${value}`}
        >
          {formattedValue}
        </h3>
        
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
            isPositive 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-rose-50 text-rose-700 border-rose-100"
          }`}>
            <span className="text-xs">{isPositive ? "↑" : "↓"}</span>
            {percentage}%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      </div>

      <div className={`p-3 rounded-xl shadow-sm ${currentTheme.iconBg} shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
