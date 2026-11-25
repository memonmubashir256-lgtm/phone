import React, {useEffect, useState} from 'react';
import {Download, MoreVertical, Share, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

const DISMISS_STORAGE_KEY = 'technova_pwa_popup_dismissed';

export const MobileInstallPopup: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => {
      setIsMobileViewport(mq.matches);
      if (!mq.matches) {
        setIsOpen(false);
      }
    };
    syncViewport();
    mq.addEventListener('change', syncViewport);
    return () => mq.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || isInstalled) return;
    try {
      if (sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1') return;
    } catch {
      // ignore storage access issues
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isMobileViewport, isInstalled]);

  const dismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      setIsOpen(false);
    }
  };

  if (!isMobileViewport || isInstalled || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061B3D]/50 p-4 backdrop-blur-[2px] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-pwa-install-title"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#E5EAF2] bg-white p-5 shadow-2xl animate-tn-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="TechNova App Icon"
              className="h-12 w-12 rounded-2xl border border-[#E5EAF2] shadow-xs shrink-0"
            />
            <div>
              <h2 id="mobile-pwa-install-title" className="font-display text-base font-bold text-[#101828]">
                Install TechNova App
              </h2>
              <p className="text-xs text-[#667085] leading-snug">
                Faster checkout, live order alerts & offline browsing on your phone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Close install popup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#667085] hover:bg-[#F4F8FF] hover:text-[#101828] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isInstallable ? (
          <div className="mt-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 text-xs font-semibold text-[#475467] hover:bg-[#E8F0FF] cursor-pointer"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0860E8] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#0860E8]/25 hover:bg-[#0650C7] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Install App</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="mt-4 space-y-3">
            <ol className="space-y-2 rounded-2xl bg-[#F4F8FF] p-3.5 text-xs text-[#101828]">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0860E8] text-[11px] font-bold text-white">
                  1
                </span>
                <span>
                  Tap the <Share className="inline h-3.5 w-3.5 text-[#0860E8]" /> <strong>Share</strong> icon in Safari.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0860E8] text-[11px] font-bold text-white">
                  2
                </span>
                <span>
                  Choose <strong>Add to Home Screen</strong> to install TechNova.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl bg-[#0860E8] py-2.5 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
            >
              Got It
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <ol className="space-y-2 rounded-2xl bg-[#F4F8FF] p-3.5 text-xs text-[#101828]">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0860E8] text-[11px] font-bold text-white">
                  1
                </span>
                <span>
                  Tap your browser menu <MoreVertical className="inline h-3.5 w-3.5 text-[#0860E8]" /> in the corner.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0860E8] text-[11px] font-bold text-white">
                  2
                </span>
                <span>
                  Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl bg-[#0860E8] py-2.5 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
