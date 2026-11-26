import React, { useState } from 'react';
import {
  CheckCircle2,
  Bookmark,
  Copy,
  Check,
  LineChart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { FormulaItem, SolveResponse } from '../types/math.ts';
import { MathDisplay, MathProse } from './MathDisplay.tsx';

interface SolutionViewProps {
  solution: SolveResponse;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (formula: FormulaItem) => void;
  onOpenGraph: () => void;
}

export const SolutionView: React.FC<SolutionViewProps> = ({
  solution,
  bookmarkedIds,
  onToggleBookmark,
  onOpenGraph,
}) => {
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(true);

  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(solution.finalAnswerLatex);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Highlighted Final Answer Card (Single Elevation, No Border-L-4, Unboxed Metadata) */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {solution.domain}
            </span>
            <span aria-hidden="true">·</span>
            <span>Final Answer</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{solution.symbolicCheck.engine}</span>
          </div>
        </div>

        {/* Original Normalized Problem */}
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          <MathDisplay latex={solution.normalizedProblemLatex} />
        </div>

        {/* Highlighted Final Answer */}
        <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/35 border border-blue-200/80 dark:border-blue-900/60 px-4 py-4 overflow-x-auto text-slate-900 dark:text-slate-50">
          <MathDisplay latex={solution.finalAnswerLatex} displayMode={true} />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {solution.symbolicCheck.computedSummary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyLatex}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            {copiedAnswer ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied LaTeX</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy LaTeX</span>
              </>
            )}
          </button>

          {solution.graphConfig.supported && (
            <button
              type="button"
              onClick={onOpenGraph}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>
                {solution.graphConfig.mode === '3d'
                  ? 'Inspect 3D Surface'
                  : 'Open Interactive Graph'}
              </span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Step-by-Step Breakdown */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Step-by-Step Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {solution.steps.length} derivation steps
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllSteps((prev) => !prev)}
            className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
          >
            <span>{showAllSteps ? 'Collapse' : 'Expand'}</span>
            {showAllSteps ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showAllSteps && (
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {solution.steps.map((step, index) => (
              <li key={step.stepNumber ?? index} className="py-4 first:pt-1 last:pb-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {String(index + 1).padStart(2, '0')}. {step.title}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {step.ruleApplied}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
                  <MathProse text={step.explanation} />
                </p>

                {step.expressionLatex && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 px-3.5 py-2.5 overflow-x-auto text-slate-900 dark:text-slate-100">
                    <MathDisplay latex={step.expressionLatex} displayMode={true} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 3. Formulas & Theorems Used (Bookmarkable) */}
      {solution.formulasUsed.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Formulas & Theorems Used
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save key identities to your Bookmarks library
            </p>
          </div>

          <div className="space-y-3">
            {solution.formulasUsed.map((formula) => {
              const isBookmarked = bookmarkedIds.has(formula.id);
              return (
                <div
                  key={formula.id}
                  className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formula.name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formula.category}</span>
                    </div>
                    <div className="overflow-x-auto py-1 text-slate-900 dark:text-slate-100">
                      <MathDisplay latex={formula.latex} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {formula.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(formula)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                      isBookmarked
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`}
                    />
                    <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
