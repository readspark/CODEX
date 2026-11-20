import React from 'react';

interface CodexLogoProps {
  size?: number;
  className?: string;
}

export const CodexLogo: React.FC<CodexLogoProps> = ({ size = 34, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer squircle prism frame */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#312E81" />
      <rect
        x="3.5"
        y="3.5"
        width="33"
        height="33"
        rx="8.5"
        stroke="#7C3AED"
        strokeWidth="1.5"
      />
      {/* Left code bracket */}
      <path
        d="M15.5 13L9.5 20L15.5 27"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right code bracket */}
      <path
        d="M24.5 13L30.5 20L24.5 27"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center curiosity diamond spark */}
      <path
        d="M20 14L23.5 20L20 26L16.5 20L20 14Z"
        fill="#3B82F6"
      />
    </svg>
  );
};
