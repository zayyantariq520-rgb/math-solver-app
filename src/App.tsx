import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  LineChart,
  History,
  Bookmark,
  Sun,
  Moon,
  Keyboard,
  FileText,
  Camera,
  CornerDownLeft,
  Loader2,
  AlertCircle,
  Download,
  WifiOff,
} from 'lucide-react';
import type {
  AppNavTab,
  FormulaItem,
  HistoryItem,
  InputTabMode,
  SolveResponse,
} from './types/math.ts';
import { DEFAULT_BOOKMARKS, SAMPLE_PROBLEMS } from './data/presets.ts';
import { MathKeyboard } from './components/MathKeyboard.tsx';
import { CameraOcrInput } from './components/CameraOcrInput.tsx';
import { SolutionView } from './components/SolutionView.tsx';
import { GraphVisualizer } from './components/GraphVisualizer.tsx';
import { HistoryTab } from './components/HistoryTab.tsx';
import { BookmarksTab } from './components/BookmarksTab.tsx';
import { DownloadCenter } from './components/DownloadCenter.tsx';
import { MathDisplay } from './components/MathDisplay.tsx';
import { useOnlineStatus } from './hooks/useOnlineStatus.ts';

const STORAGE_HISTORY_KEY = 'axiomlab_history_v1';
const STORAGE_BOOKMARKS_KEY = 'axiomlab_bookmarks_v1';
const STORAGE_THEME_KEY = 'axiomlab_theme_v1';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const isOnline = useOnlineStatus();
  const [navTab, setNavTab] = useState<AppNavTab>('solver');
  const [inputMode, setInputMode] = useState<InputTabMode>('keyboard');

  const [keyboardExpr, setKeyboardExpr] = useState<string>(
    '\\int_{0}^{3} (3x^2 - 4x + 5)\\,dx'
  );
  const [textProblem, setTextProblem] = useState<string>(
    'A rocket is launched vertically so its height in meters after t seconds is h(t) = -4.9*t^2 + 39.2*t + 12. Find the maximum height and when it hits the ground.'
  );

  const [isSolving, setIsSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [currentSolution, setCurrentSolution] = useState<SolveResponse | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  const [bookmarks, setBookmarks] = useState<FormulaItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as FormulaItem[]) : DEFAULT_BOOKMARKS;
    } catch {
      return DEFAULT_BOOKMARKS;
    }
  });

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist history & bookmarks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore quota errors
    }
  }, [bookmarks]);

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map((b) => b.id)),
    [bookmarks]
  );

  const solveProblem = async (params: {
    problem: string;
    problemLatex?: string;
    sourceMode: InputTabMode;
  }) => {
    const trimmed = params.problem.trim();
    if (!trimmed) {
      setSolveError('Please enter an equation or word problem to solve.');
      return;
    }

    setIsSolving(true);
    setSolveError(null);
    setNavTab('solver');

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: trimmed,
          problemLatex: params.problemLatex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to solve this problem.');
      }

      const solved = data as SolveResponse;
      setCurrentSolution(solved);

      const historyEntry: HistoryItem = {
        ...solved,
        sourceMode: params.sourceMode,
      };
      setHistory((prev) => [historyEntry, ...prev].slice(0, 40));
    } catch (err) {
      setSolveError(
        err instanceof Error ? err.message : 'An unexpected error occurred while solving.'
      );
    } finally {
      setIsSolving(false);
    }
  };

  const toggleBookmark = (formula: FormulaItem) => {
    setBookmarks((prev) => {
      const exists = prev.some((f) => f.id === formula.id);
      if (exists) {
        return prev.filter((f) => f.id !== formula.id);
      }
      return [formula, ...prev];
    });
  };

  const loadSample = (expr: string, latex: string, isWordProblem: boolean) => {
    setSolveError(null);
    if (isWordProblem) {
      setInputMode('text');
      setTextProblem(expr);
      solveProblem({ problem: expr, problemLatex: latex, sourceMode: 'text' });
    } else {
      setInputMode('keyboard');
      setKeyboardExpr(latex || expr);
      solveProblem({ problem: expr, problemLatex: latex, sourceMode: 'keyboard' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 md:pb-8">
      {/* Top Navigation Bar (Strict 3-zone contract, <=56px height) */}
      <header className="sticky top-0 z-30 h-[52px] md:h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setNavTab('solver')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 text-left"
          >
            AxiomLab
          </button>

          {/* Zone 2: Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { id: 'solver', label: 'Solver' },
                { id: 'graphing', label: 'Graphing' },
                { id: 'history', label: 'History' },
                { id: 'bookmarks', label: 'Bookmarks' },
                { id: 'download', label: 'Download' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setNavTab(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  navTab === item.id
                    ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Utility Action (Theme Toggle) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {navTab === 'solver' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Multi-Modal Input Workspace */}
            <div className="lg:col-span-5 space-y-5">
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 text-balance">
                    Multi-Modal Math Solver
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Algebra, calculus, trigonometry, matrices, ODEs & word problems
                  </p>
                </div>

                {/* Multi-Modal Input Mode Switcher */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setInputMode('keyboard')}
                    className={`min-h-[42px] px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                      inputMode === 'keyboard'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5 shrink-0" />
                    <span>Keyboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`min-h-[42px] px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                      inputMode === 'text'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Word / Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('camera')}
                    className={`min-h-[42px] px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                      inputMode === 'camera'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>Camera OCR</span>
                  </button>
                </div>

                {/* Active Input Mode Panel */}
                {inputMode === 'keyboard' && (
                  <MathKeyboard
                    value={keyboardExpr}
                    onChange={setKeyboardExpr}
                    onSolve={() =>
                      solveProblem({
                        problem: keyboardExpr,
                        problemLatex: keyboardExpr,
                        sourceMode: 'keyboard',
                      })
                    }
                    isSolving={isSolving}
                  />
                )}

                {inputMode === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="word-problem-input"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2"
                      >
                        Describe your math problem in plain English or symbolic notation
                      </label>
                      <textarea
                        id="word-problem-input"
                        rows={5}
                        value={textProblem}
                        onChange={(e) => setTextProblem(e.target.value)}
                        placeholder="e.g. A cylindrical tank of radius 3m is filled at 2 m^3/min. How fast is the water level rising?"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-3.5 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600 transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        solveProblem({
                          problem: textProblem,
                          sourceMode: 'text',
                        })
                      }
                      disabled={isSolving || !textProblem.trim()}
                      className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                      <span>{isSolving ? 'Analyzing & Solving...' : 'Solve Word Problem'}</span>
                    </button>
                  </div>
                )}

                {inputMode === 'camera' && (
                  <CameraOcrInput
                    onUseExtracted={(plain, latex) => {
                      setKeyboardExpr(latex || plain);
                      setInputMode('keyboard');
                    }}
                    onSolveExtracted={(plain, latex) => {
                      setKeyboardExpr(latex || plain);
                      solveProblem({
                        problem: plain || latex,
                        problemLatex: latex,
                        sourceMode: 'camera',
                      });
                    }}
                  />
                )}
              </section>

              {/* Quick Sample Problems Selector */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Try Complex Examples
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    One-tap problems across every mathematical discipline
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {SAMPLE_PROBLEMS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() =>
                        loadSample(
                          sample.expression,
                          sample.latex,
                          sample.domain === 'Word Problem'
                        )
                      }
                      className="min-h-[48px] text-left rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-800 px-3.5 py-2.5 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {sample.domain}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{sample.title}</span>
                      </div>
                      <div className="mt-1 overflow-x-auto text-xs text-slate-900 dark:text-slate-200">
                        <MathDisplay latex={sample.latex} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Step-by-Step Solution & Interactive Plotter */}
            <div className="lg:col-span-7 space-y-6">
              {solveError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <div className="font-semibold">Solver Error</div>
                    <p className="text-xs mt-0.5 text-red-700 dark:text-red-300">
                      {solveError}
                    </p>
                  </div>
                </div>
              )}

              {isSolving ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
                  <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Deriving Step-by-Step Solution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Running symbolic & numeric verification alongside step-by-step theorem analysis.
                  </p>
                </div>
              ) : currentSolution ? (
                <>
                  <SolutionView
                    solution={currentSolution}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={toggleBookmark}
                    onOpenGraph={() => setNavTab('graphing')}
                  />

                  {currentSolution.graphConfig.supported && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Interactive Graph Preview
                        </h3>
                        <button
                          type="button"
                          onClick={() => setNavTab('graphing')}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Expand Fullscreen Lab
                        </button>
                      </div>
                      <GraphVisualizer
                        graphConfig={currentSolution.graphConfig}
                        isDark={isDark}
                        compact={true}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      Ready to Solve & Visualize
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Enter an equation with the scientific keyboard, describe a word problem, or scan a photo. Every solution combines Gemini mathematical reasoning with Math.js symbolic verification, KaTeX notation, and interactive 2D/3D graphs.
                    </p>
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {[
                        { label: 'Calculus', detail: 'Integrals, limits & derivatives' },
                        { label: 'Algebra & ODEs', detail: 'Roots, inequalities & systems' },
                        { label: '2D & 3D Graphs', detail: 'Intercepts, asymptotes & surfaces' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 p-3"
                        >
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.label}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Interactive Graphing Sandbox right on initial desktop view */}
                  <GraphVisualizer isDark={isDark} compact={true} />
                </div>
              )}
            </div>
          </div>
        )}

        {navTab === 'graphing' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Interactive 2D & 3D Graphing Calculator
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Plot functions, inequalities, roots, asymptotes, and 3D surfaces z = f(x, y)
                </p>
              </div>
              {currentSolution && (
                <button
                  type="button"
                  onClick={() => setNavTab('solver')}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Back to Solution Steps
                </button>
              )}
            </div>

            <GraphVisualizer
              graphConfig={currentSolution?.graphConfig}
              isDark={isDark}
              compact={false}
            />
          </div>
        )}

        {navTab === 'history' && (
          <HistoryTab
            history={history}
            onSelectProblem={(item) => {
              setCurrentSolution(item);
              if (item.sourceMode === 'text') {
                setInputMode('text');
                setTextProblem(item.problemInput);
              } else {
                setInputMode('keyboard');
                setKeyboardExpr(item.normalizedProblemLatex || item.problemInput);
              }
              setNavTab('solver');
            }}
            onDeleteItem={(id) =>
              setHistory((prev) => prev.filter((item) => item.id !== id))
            }
            onClearAll={() => setHistory([])}
          />
        )}

        {navTab === 'bookmarks' && (
          <BookmarksTab
            bookmarks={bookmarks}
            onRemoveBookmark={(id) =>
              setBookmarks((prev) => prev.filter((item) => item.id !== id))
            }
            onTryExample={(problem) => {
              setInputMode('keyboard');
              setKeyboardExpr(problem);
              solveProblem({ problem, sourceMode: 'keyboard' });
            }}
          />
        )}

        {navTab === 'download' && <DownloadCenter />}
      </main>

      {!isOnline && (
        <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3.5 py-2 text-xs font-medium text-amber-900 dark:text-amber-200 shadow-lg">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Mode — Local graphing and cached UI remain available.</span>
        </div>
      )}

      {/* Mobile Bottom Tab Bar (Thumb Zone, <= 56px height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {(
            [
              { id: 'solver', label: 'Solver', icon: Calculator },
              { id: 'graphing', label: 'Graph', icon: LineChart },
              { id: 'history', label: 'History', icon: History },
              { id: 'bookmarks', label: 'Saved', icon: Bookmark },
              { id: 'download', label: 'Get App', icon: Download },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = navTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNavTab(tab.id)}
                className={`h-full min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] tracking-tight mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
