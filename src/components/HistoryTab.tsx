import React, { useMemo, useState } from 'react';
import { History, Trash2, Search, ArrowUpRight } from 'lucide-react';
import type { HistoryItem } from '../types/math.ts';
import { MathDisplay } from './MathDisplay.tsx';

interface HistoryTabProps {
  history: HistoryItem[];
  onSelectProblem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

const DOMAIN_FILTERS = [
  'All',
  'Algebra',
  'Calculus',
  'Trigonometry',
  'Linear Algebra',
  'Differential Equations',
  'Word Problem',
] as const;

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onSelectProblem,
  onDeleteItem,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('All');

  const filtered = useMemo(() => {
    return history.filter((item) => {
      const matchesDomain = domainFilter === 'All' || item.domain === domainFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.problemInput.toLowerCase().includes(q) ||
        item.finalAnswerPlain.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q);
      return matchesDomain && matchesQuery;
    });
  }, [history, domainFilter, searchQuery]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Solved Problem History
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reopen any past calculation, derivation, or interactive graph
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Search & Domain Segmented Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past equations or answers..."
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {DOMAIN_FILTERS.map((domain) => (
          <button
            key={domain}
            type="button"
            onClick={() => setDomainFilter(domain)}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              domainFilter === domain
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {domain}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {history.length === 0 ? 'No solved problems yet' : 'No matching history items'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {history.length === 0
              ? 'Solve an equation, integral, or word problem to save it automatically here.'
              : 'Try clearing your search filter or switching domains.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <button
                type="button"
                onClick={() => onSelectProblem(item)}
                className="flex-1 text-left min-w-0 space-y-1.5"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {item.domain}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{item.sourceMode} input</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="overflow-x-auto text-slate-900 dark:text-slate-100 py-0.5">
                  <MathDisplay latex={item.normalizedProblemLatex} />
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 overflow-x-auto">
                  <span className="text-slate-400 shrink-0">Answer:</span>
                  <MathDisplay latex={item.finalAnswerLatex} />
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectProblem(item)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>Open</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  aria-label="Delete history item"
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
