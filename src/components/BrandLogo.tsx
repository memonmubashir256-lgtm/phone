import React from 'react';

export const TechNovaLogo: React.FC<{className?: string}> = ({className = 'h-9 w-9'}) => (
  <span
    className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1D75F0] to-[#0860E8] text-white shadow-sm ${className}`}
    aria-hidden="true"
  >
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1">
      <rect x="6" y="3" width="12" height="18" rx="3" />
      <path d="M10 6h4" strokeLinecap="round" />
      <path d="M12 10v5M9.5 12.5L12 10l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

export const BrandMark: React.FC<{slug: string}> = ({slug}) => {
  switch (slug.toLowerCase()) {
    case 'apple':
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#101828]" fill="currentColor" aria-hidden="true">
          <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
        </svg>
      );
    case 'samsung':
      return (
        <span className="font-display text-xs font-extrabold tracking-widest text-[#1428A0] uppercase">
          SAMSUNG
        </span>
      );
    case 'google':
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.4 7.3 24 12 24z" />
          <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10.1 0 12s.4 3.8 1.2 5.4l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.6 1.2 6.6l4 3.1c1-2.9 3.7-4.9 6.8-4.9z" />
        </svg>
      );
    case 'oneplus':
      return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#EB0028] font-mono text-sm font-extrabold text-[#EB0028]">
          1+
        </span>
      );
    case 'xiaomi':
      return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6900] font-display text-xs font-extrabold text-white">
          mi
        </span>
      );
    default:
      return (
        <span className="rounded-md bg-[#FFE436] px-2.5 py-1 font-display text-xs font-extrabold tracking-tight text-[#101828]">
          realme
        </span>
      );
  }
};
