"use client";

import React from "react";

interface AddLeadButtonProps {
  onClick: () => void;
}

export default function AddLeadButton({ onClick }: AddLeadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.16)] transition duration-300 transform hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(37,99,235,0.24)]"
    >
      + Add Lead
    </button>
  );
}
