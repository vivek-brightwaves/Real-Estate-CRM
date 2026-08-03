"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface PageHeaderProps {
  breadcrumb?: string;
  title: string;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  searchFilter?: React.ReactNode;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

export default function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
  searchFilter,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 mb-8 border-b border-slate-200/60 dark:border-slate-800/60 w-full relative z-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 min-w-0"
      >
        {breadcrumb && (
          <motion.nav
            variants={itemVariants}
            className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase select-none mb-1.5"
          >
            {breadcrumb}
          </motion.nav>
        )}
        <motion.h1
          variants={itemVariants}
          className="text-[32px] font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight leading-none"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            variants={itemVariants}
            className="text-[16px] font-medium text-slate-500 dark:text-slate-400 mt-2"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
      {(actions || searchFilter) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {searchFilter}
          {actions}
        </div>
      )}
    </div>
  );
}
