"use client";

import React, { useState, useEffect, useRef } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface StatsCardProps {
  label: string;
  value: string | number;
  growth?: string | number;
  isPositive?: boolean;
  color: "blue" | "green" | "purple" | "orange" | "pink" | "cyan";
  sparklineData?: Array<{ value: number }>;
  icon: React.ReactNode;
  delay?: number; // Delay in milliseconds passed from parent
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

export default function StatsCard({ label, value, growth, isPositive = true, color, sparklineData, icon, delay = 0 }: StatsCardProps) {
  const themes = {
    blue: {
      gradient: "from-blue-50/40 via-white to-blue-50/15",
      accent: "text-blue-600",
      bgLight: "bg-blue-50/60 text-blue-600 border border-blue-100/50",
      glow: "shadow-blue-500/5",
      sparkColor: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.16)",
    },
    green: {
      gradient: "from-emerald-50/40 via-white to-emerald-50/15",
      accent: "text-emerald-600",
      bgLight: "bg-emerald-50/60 text-emerald-600 border border-emerald-100/50",
      glow: "shadow-emerald-500/5",
      sparkColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.16)",
    },
    purple: {
      gradient: "from-purple-50/40 via-white to-purple-50/15",
      accent: "text-purple-600",
      bgLight: "bg-purple-50/60 text-purple-600 border border-purple-100/50",
      glow: "shadow-purple-500/5",
      sparkColor: "#8b5cf6",
      glowColor: "rgba(139, 92, 246, 0.16)",
    },
    orange: {
      gradient: "from-orange-50/40 via-white to-orange-50/15",
      accent: "text-orange-600",
      bgLight: "bg-orange-50/60 text-orange-600 border border-orange-100/50",
      glow: "shadow-orange-500/5",
      sparkColor: "#f97316",
      glowColor: "rgba(249, 115, 22, 0.16)",
    },
    pink: {
      gradient: "from-pink-50/40 via-white to-pink-50/15",
      accent: "text-pink-600",
      bgLight: "bg-pink-50/60 text-pink-600 border border-pink-100/50",
      glow: "shadow-pink-500/5",
      sparkColor: "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.16)",
    },
    cyan: {
      gradient: "from-cyan-50/40 via-white to-cyan-50/15",
      accent: "text-cyan-600",
      bgLight: "bg-cyan-50/60 text-cyan-600 border border-cyan-100/50",
      glow: "shadow-cyan-500/5",
      sparkColor: "#06b6d4",
      glowColor: "rgba(6, 182, 212, 0.16)",
    },
  };

  const currentTheme = themes[color] || themes.blue;

  // Sparkline data
  const sparkData = sparklineData || [
    { value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }, { value: 16 }, { value: 24 }
  ];

  // States for animations
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [displayValue, setDisplayValue] = useState<string | number>("0");

  // Page load delay timer (load state flips after animation finishes)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
    }, delay + 900); // delay + duration (900ms)
    return () => clearTimeout(timer);
  }, [delay]);

  // Number counting animation (1.2 seconds, Ease Out, formats at each frame)
  useEffect(() => {
    let active = true;
    const startTimeout = setTimeout(() => {
      if (!active) return;
      
      const rawValStr = String(value);
      const numericMatch = rawValStr.replace(/,/g, '').match(/[\d.]+/);
      if (!numericMatch) {
        setDisplayValue(formatLargeValue(rawValStr, label));
        return;
      }

      const targetVal = parseFloat(numericMatch[0]);
      const prefix = rawValStr.substring(0, rawValStr.indexOf(numericMatch[0]));
      const suffix = rawValStr.substring(rawValStr.indexOf(numericMatch[0]) + numericMatch[0].length);

      let start = 0;
      const duration = 1200;
      const startTime = performance.now();

      const animate = (now: number) => {
        if (!active) return;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress);
        const currentVal = start + easeProgress * (targetVal - start);
        
        const frameFormatted = formatLargeValue(`${prefix}${currentVal}${suffix}`, label);
        setDisplayValue(frameFormatted);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => {
      active = false;
      clearTimeout(startTimeout);
    };
  }, [value, delay, label]);

  // Mouse parallax motion handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2); // range [-1, 1]
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2); // range [-1, 1]
    setCoords({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 180);
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative overflow-hidden bg-gradient-to-br ${currentTheme.gradient} rounded-2xl p-5 border border-[#E8EDF7] hover:border-slate-355/65 flex flex-col justify-between backdrop-blur-md bg-white/95 cursor-pointer select-none group w-full h-full min-h-[148px]`}
      style={{
        animation: loaded ? "none" : "statsCardLoad 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        animationDelay: `${delay}ms`,
        opacity: loaded ? 1 : 0,
        transform: loaded 
          ? `translateY(${isClicked ? 0 : isHovered ? -8 : 0}px) scale(${isClicked ? 0.96 : isHovered ? 1.03 : 1})`
          : undefined,
        boxShadow: isHovered
          ? `0 24px 60px ${currentTheme.glowColor}`
          : "0 10px 30px rgba(15,23,42,0.08)",
        transition: isHovered 
          ? "transform 350ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 350ms cubic-bezier(0.22, 1, 0.36, 1), border-color 350ms cubic-bezier(0.22, 1, 0.36, 1)"
          : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 350ms cubic-bezier(0.22, 1, 0.36, 1), border-color 350ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform, opacity, box-shadow",
      }}
      title={`Metric value: ${value}`}
    >
      {/* 8-second slow animated floating radial background glow at 6% opacity */}
      <div 
        className="animate-float-glow"
        style={{
          background: `radial-gradient(circle, ${currentTheme.sparkColor} 0%, transparent 65%)`
        }}
      />

      {/* Mouse hover tracking radial glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-355 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${(coords.x + 1) * 50}% ${(coords.y + 1) * 50}%, ${currentTheme.sparkColor} 0%, transparent 70%)`
        }}
      />

      {/* Top Header: KPI Details & Icon */}
      <div className="flex justify-between items-start relative z-10 w-full min-w-0">
        <div 
          className="space-y-1 transition-transform duration-355 ease-out flex-1 min-w-0 pr-2"
          style={{
            transform: isHovered ? `translate(${coords.x * 2}px, ${coords.y * 2}px)` : "none"
          }}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block truncate">{label}</span>
          <h3 
            className="font-bold text-slate-900 tracking-tight mt-0.5"
            style={{ 
              fontSize: 'clamp(1.75rem, 3.2vw, 2.25rem)', 
              whiteSpace: 'nowrap',
            }}
            title={`Full value: ${value}`}
          >
            {displayValue}
          </h3>
        </div>

        {/* Icon Container with Parallax, Floating, Rotation and Soft glow animation */}
        <div 
          className={`p-2 rounded-xl border transition-all duration-400 ${currentTheme.bgLight} shrink-0`}
          style={{
            transform: isHovered 
              ? `translate(${coords.x * 5}px, ${coords.y * 5 - 4}px) rotate(5deg)` 
              : "none",
            boxShadow: isHovered ? `0 0 15px ${currentTheme.glowColor}` : "none"
          }}
        >
          <div className={`${isHovered ? "animate-pulse" : ""}`} style={{ animationDuration: "2s" }}>
            {icon}
          </div>
        </div>
      </div>

      {/* Spacing & Growth Percentage Info Badge */}
      <div className="flex items-center justify-between mt-3 relative z-10 w-full">
        <div 
          className="flex items-center gap-1.5 transition-transform duration-355 ease-out min-w-0"
          style={{
            transform: isHovered ? `translate(${coords.x * 1.5}px, ${coords.y * 1.5}px)` : "none"
          }}
        >
          {growth !== undefined ? (
            <>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-500 shrink-0 ${
                  isPositive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/60"
                    : "bg-rose-50 text-rose-700 border-rose-100/60"
                } ${displayValue !== "0" ? "scale-100 opacity-100" : "scale-80 opacity-0"}`}
              >
                <span>{isPositive ? "↑" : "↓"}</span>
                {growth}%
              </span>
              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider truncate">MoM Change</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live data
            </span>
          )}
        </div>
      </div>

      {/* Sparkline chart bottom container */}
      <div className="w-full h-11 mt-3 overflow-hidden relative rounded-xl px-1 z-10">
        {/* Glow Sweep Dot Animation - duration 1.5s */}
        {displayValue !== "0" && (
          <div 
            className="animate-sweep-dot" 
            style={{ 
              backgroundColor: currentTheme.sparkColor,
              boxShadow: `0 0 8px ${currentTheme.sparkColor}`,
              animationDuration: "1.5s"
            }} 
          />
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 2, left: 2, right: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentTheme.sparkColor} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={currentTheme.sparkColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={currentTheme.sparkColor} 
              strokeWidth={2} 
              fillOpacity={displayValue !== "0" ? 1 : 0} 
              fill={`url(#grad-${color})`} 
              dot={false}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
