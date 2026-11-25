import React from 'react';
import {RefreshCw, WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-[#061B3D] px-4 py-3 text-xs text-white shadow-xl md:bottom-5 md:left-5 md:right-auto"
    >
      <div className="flex items-center gap-2.5">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <span>Offline Mode — Viewing cached catalog. Checkout requires internet.</span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-semibold text-white hover:bg-white/25 transition shrink-0 cursor-pointer"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
};
