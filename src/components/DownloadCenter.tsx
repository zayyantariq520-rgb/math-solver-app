import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Copy,
  Check,
  Archive,
  CheckCircle2,
  Share,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const DownloadCenter: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedKey, setCopiedKey] = useState<'zip' | 'app' | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const zipDownloadUrl = `${origin}/api/download-app`;

  const copyText = async (text: string, key: 'zip' | 'app') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Download & Install AxiomLab
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Download the full source code package or install AxiomLab directly onto your phone or desktop
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Direct Source Code ZIP Download */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Download Complete App Archive (.zip)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Includes the React + Vite frontend, Express + Gemini + Math.js backend, KaTeX configuration, 2D/3D graphing calculator, and PWA manifest.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2.5 flex items-center justify-between gap-2">
              <code className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {zipDownloadUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText(zipDownloadUrl, 'zip')}
                className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedKey === 'zip' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <a
            href="/api/download-app"
            download="axiomlab-math-solver.zip"
            className="min-h-[48px] w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download App (.zip)</span>
          </a>
        </section>

        {/* 2. Install as Mobile / Desktop App (PWA) */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Install on Phone or Desktop
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Install AxiomLab to your iOS, Android, or desktop home screen for standalone full-screen launch and offline graphing access.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2.5 flex items-center justify-between gap-2">
              <code className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {origin}
              </code>
              <button
                type="button"
                onClick={() => copyText(origin, 'app')}
                className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedKey === 'app' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy App URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isInstalled ? (
            <div className="min-h-[48px] w-full px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Installed in Standalone Mode</span>
            </div>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={install}
              className="min-h-[48px] w-full px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install App Now</span>
            </button>
          ) : isIOS ? (
            <button
              type="button"
              onClick={() => setShowIOSGuide((prev) => !prev)}
              className="min-h-[48px] w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Share className="w-4 h-4" />
              <span>How to Install on iOS Safari</span>
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
              Open this app URL directly in Chrome, Edge, or Safari on your device and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
            </div>
          )}

          {showIOSGuide && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 text-xs text-slate-700 dark:text-slate-200 space-y-1">
              <p className="font-semibold">Install on iPhone or iPad:</p>
              <p>1. Tap the Share button in Safari.</p>
              <p>2. Scroll down and tap Add to Home Screen.</p>
            </div>
          )}
        </section>
      </div>

      {/* Local Setup Instructions for Downloaded ZIP */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Running the Downloaded Archive Locally
        </h3>
        <pre className="rounded-xl bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
{`unzip axiomlab-math-solver.zip -d axiomlab
cd axiomlab
npm install
cp .env.example .env   # add your GEMINI_API_KEY
npm run dev`}
        </pre>
      </section>
    </div>
  );
};
