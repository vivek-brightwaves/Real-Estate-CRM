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
      className="btn-premium-action btn-add-lead"
    >
      + Add Lead
    </button>
  );
}
