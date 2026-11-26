import React, { useMemo, useState } from 'react';
import { Bookmark, Copy, Check, Play, Search } from 'lucide-react';
import type { FormulaItem } from '../types/math.ts';
import { MathDisplay } from './MathDisplay.tsx';

interface BookmarksTabProps {
  bookmarks: FormulaItem[];
  onRemoveBookmark: (id: string) => void;
  onTryExample: (problem: string) => void;
}

export const BookmarksTab: React.FC<BookmarksTabProps> = ({
  bookmarks,
  onRemoveBookmark,
  onTryExample,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [bookmarks, searchQuery]);

  const copyLatex = async (id: string, latex: string) => {
    try {
      await navigator.clipboard.writeText(latex);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Bookmarked Formulas & Theorems
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your personal reference sheet of saved identities and solver theorems
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search saved formulas by name or theorem..."
          className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
            <Bookmark className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No formulas found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bookmark any theorem from a solved problem to keep it handy here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((formula) => (
            <article
              key={formula.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {formula.category}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {formula.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(formula.id)}
                    aria-label="Remove bookmark"
                    className="min-h-[36px] min-w-[36px] rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-colors"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 px-3.5 py-3 overflow-x-auto text-slate-900 dark:text-slate-100">
                  <MathDisplay latex={formula.latex} displayMode={true} />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {formula.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => copyLatex(formula.id, formula.latex)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === formula.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy LaTeX</span>
                    </>
                  )}
                </button>

                {formula.exampleProblem && (
                  <button
                    type="button"
                    onClick={() => onTryExample(formula.exampleProblem!)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Solve Example</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
