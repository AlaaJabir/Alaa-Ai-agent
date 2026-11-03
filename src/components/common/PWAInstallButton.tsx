import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA mode, don't clutter the UI
  if (isInstalled) {
    return null;
  }

  // Chromium / Desktop / Android native install
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium shadow-md shadow-blue-500/20 transition-all ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 active:scale-95 text-slate-200 font-medium transition-all ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                    MA
                  </div>
                  <h3 className="text-base font-semibold">Install MY AGENT on iPhone</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Step 1:</span> Tap the{' '}
                    <strong className="text-blue-400">Share</strong> icon at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Step 2:</span> Scroll down and tap{' '}
                    <strong className="text-indigo-400">Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 text-[11px] text-slate-400">
                  MY AGENT will launch in full-screen standalone mode with offline IndexedDB access and hardware encryption support.
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-white transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
