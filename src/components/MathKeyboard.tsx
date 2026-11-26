import React, { useRef, useState } from 'react';
import { Delete, CornerDownLeft, RotateCcw } from 'lucide-react';
import { MathDisplay } from './MathDisplay.tsx';

interface KeyDef {
  label: string;
  latexDisplay?: string;
  insert: string;
  cursorBack?: number;
  title: string;
  variant?: 'default' | 'operator' | 'accent';
}

type KeyboardTab = 'algebra' | 'calculus' | 'matrices';

const KEY_SETS: Record<KeyboardTab, KeyDef[]> = {
  algebra: [
    { label: 'x', insert: 'x', title: 'Variable x' },
    { label: 'y', insert: 'y', title: 'Variable y' },
    { label: 'a/b', latexDisplay: '\\frac{a}{b}', insert: '\\frac{}{}', cursorBack: 3, title: 'Fraction' },
    { label: 'x^2', latexDisplay: 'x^2', insert: '^2', title: 'Square' },
    { label: 'x^n', latexDisplay: 'x^n', insert: '^{}', cursorBack: 1, title: 'Exponent' },
    { label: 'sqrt', latexDisplay: '\\sqrt{x}', insert: '\\sqrt{}', cursorBack: 1, title: 'Square root' },
    { label: 'nroot', latexDisplay: '\\sqrt[n]{x}', insert: '\\sqrt[]{}', cursorBack: 4, title: 'Nth root' },
    { label: '|x|', insert: '|x|', title: 'Absolute value' },
    { label: '7', insert: '7', title: '7' },
    { label: '8', insert: '8', title: '8' },
    { label: '9', insert: '9', title: '9' },
    { label: '÷', insert: '/', title: 'Divide', variant: 'operator' },
    { label: '(', insert: '(', title: 'Open parenthesis' },
    { label: ')', insert: ')', title: 'Close parenthesis' },
    { label: '4', insert: '4', title: '4' },
    { label: '5', insert: '5', title: '5' },
    { label: '6', insert: '6', title: '6' },
    { label: '×', insert: '*', title: 'Multiply', variant: 'operator' },
    { label: '<=', latexDisplay: '\\le', insert: '\\le ', title: 'Less than or equal', variant: 'operator' },
    { label: '>=', latexDisplay: '\\ge', insert: '\\ge ', title: 'Greater than or equal', variant: 'operator' },
    { label: '1', insert: '1', title: '1' },
    { label: '2', insert: '2', title: '2' },
    { label: '3', insert: '3', title: '3' },
    { label: '−', insert: '-', title: 'Subtract', variant: 'operator' },
    { label: '=', insert: ' = ', title: 'Equals', variant: 'operator' },
    { label: '!=', latexDisplay: '\\neq', insert: '\\neq ', title: 'Not equal', variant: 'operator' },
    { label: '0', insert: '0', title: '0' },
    { label: '.', insert: '.', title: 'Decimal point' },
    { label: ',', insert: ', ', title: 'Comma separator' },
    { label: '+', insert: '+', title: 'Add', variant: 'operator' },
  ],
  calculus: [
    { label: 'int', latexDisplay: '\\int', insert: '\\int ', title: 'Indefinite integral', variant: 'operator' },
    { label: 'dint', latexDisplay: '\\int_a^b', insert: '\\int_{}^{} ', cursorBack: 4, title: 'Definite integral', variant: 'operator' },
    { label: 'd/dx', latexDisplay: '\\frac{d}{dx}', insert: '\\frac{d}{dx}()', cursorBack: 1, title: 'Derivative', variant: 'operator' },
    { label: 'pdx', latexDisplay: '\\frac{\\partial}{\\partial x}', insert: '\\frac{\\partial}{\\partial x}()', cursorBack: 1, title: 'Partial derivative', variant: 'operator' },
    { label: 'lim', latexDisplay: '\\lim_{x\\to\\infty}', insert: '\\lim_{x \\to \\infty} ', title: 'Limit', variant: 'operator' },
    { label: 'sum', latexDisplay: '\\sum', insert: '\\sum_{n=1}^{\\infty} ', title: 'Summation', variant: 'operator' },
    { label: 'sin', insert: '\\sin(', title: 'Sine' },
    { label: 'cos', insert: '\\cos(', title: 'Cosine' },
    { label: 'tan', insert: '\\tan(', title: 'Tangent' },
    { label: 'arcsin', insert: '\\arcsin(', title: 'Inverse sine' },
    { label: 'ln', insert: '\\ln(', title: 'Natural logarithm' },
    { label: 'log', insert: '\\log_{10}(', title: 'Base-10 logarithm' },
    { label: 'e^x', latexDisplay: 'e^x', insert: 'e^{}', cursorBack: 1, title: 'Exponential' },
    { label: 'dy/dx', latexDisplay: "y'", insert: "y'", title: 'Prime derivative' },
    { label: "y''", latexDisplay: "y''", insert: "y''", title: 'Second derivative' },
    { label: 'inf', latexDisplay: '\\infty', insert: '\\infty', title: 'Infinity' },
    { label: 'dx', insert: '\\,dx', title: 'Differential dx' },
    { label: 'dt', insert: '\\,dt', title: 'Differential dt' },
  ],
  matrices: [
    {
      label: '2x2',
      latexDisplay: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
      insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
      title: '2x2 Matrix',
      variant: 'operator',
    },
    {
      label: '3x3',
      latexDisplay: '[3\\times 3]',
      insert: '\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}',
      title: '3x3 Identity Matrix',
      variant: 'operator',
    },
    { label: 'det', insert: '\\det(', title: 'Determinant', variant: 'operator' },
    { label: 'vec', latexDisplay: '\\vec{v}', insert: '\\vec{}', cursorBack: 1, title: 'Vector' },
    { label: 'prod', latexDisplay: '\\prod', insert: '\\prod_{i=1}^{n} ', title: 'Product', variant: 'operator' },
    { label: 'cdot', latexDisplay: '\\cdot', insert: '\\cdot ', title: 'Dot product', variant: 'operator' },
    { label: 'theta', latexDisplay: '\\theta', insert: '\\theta', title: 'Theta' },
    { label: 'pi', latexDisplay: '\\pi', insert: '\\pi', title: 'Pi' },
    { label: 'Sigma', latexDisplay: '\\Sigma', insert: '\\Sigma', title: 'Capital Sigma' },
    { label: 'alpha', latexDisplay: '\\alpha', insert: '\\alpha', title: 'Alpha' },
    { label: 'beta', latexDisplay: '\\beta', insert: '\\beta', title: 'Beta' },
    { label: 'lambda', latexDisplay: '\\lambda', insert: '\\lambda', title: 'Lambda' },
    { label: 'Delta', latexDisplay: '\\Delta', insert: '\\Delta', title: 'Delta' },
    { label: 'omega', latexDisplay: '\\omega', insert: '\\omega', title: 'Omega' },
    { label: 'pm', latexDisplay: '\\pm', insert: '\\pm ', title: 'Plus-minus' },
    { label: 'to', latexDisplay: '\\to', insert: '\\to ', title: 'Arrow' },
    { label: 'in', latexDisplay: '\\in', insert: '\\in ', title: 'Element of' },
    { label: 'R', latexDisplay: '\\mathbb{R}', insert: '\\mathbb{R}', title: 'Real numbers' },
  ],
};

interface MathKeyboardProps {
  value: string;
  onChange: (next: string) => void;
  onSolve: () => void;
  isSolving: boolean;
}

export const MathKeyboard: React.FC<MathKeyboardProps> = ({
  value,
  onChange,
  onSolve,
  isSolving,
}) => {
  const [activeTab, setActiveTab] = useState<KeyboardTab>('algebra');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const insertToken = (token: string, cursorBack = 0) => {
    const el = inputRef.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const nextVal = value.slice(0, start) + token + value.slice(end);
    onChange(nextVal);

    requestAnimationFrame(() => {
      el.focus();
      const pos = Math.max(0, start + token.length - cursorBack);
      el.setSelectionRange(pos, pos);
    });
  };

  const handleBackspace = () => {
    const el = inputRef.current;
    if (!el) {
      onChange(value.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    if (start !== end) {
      const nextVal = value.slice(0, start) + value.slice(end);
      onChange(nextVal);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    } else if (start > 0) {
      const nextVal = value.slice(0, start - 1) + value.slice(start);
      onChange(nextVal);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start - 1, start - 1);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Live KaTeX Preview Box */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4 min-h-[84px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>Live LaTeX Preview</span>
          <span className="font-mono tabular-nums">{value.length} chars</span>
        </div>
        <div className="overflow-x-auto py-1 text-slate-900 dark:text-slate-100">
          {value.trim() ? (
            <MathDisplay latex={value} displayMode={true} />
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
              Tap keys below or type LaTeX / math expressions to preview
            </p>
          )}
        </div>
      </div>

      {/* Editable Expression Field */}
      <div>
        <label htmlFor="math-keyboard-input" className="sr-only">
          Mathematical Expression Input
        </label>
        <textarea
          id="math-keyboard-input"
          ref={inputRef}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSolve();
            }
          }}
          placeholder="e.g. \int_{0}^{3} (3x^2 - 4x + 5)\,dx  or  2x^2 - 5x - 3 = 0"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600 transition-colors resize-none"
        />
      </div>

      {/* Keyboard Category Tabs & Utility Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
          {(
            [
              { id: 'algebra', label: 'Algebra' },
              { id: 'calculus', label: 'Calculus & Trig' },
              { id: 'matrices', label: 'Matrices & Greek' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleBackspace}
            title="Backspace"
            className="min-h-[40px] min-w-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.97] transition-all flex items-center justify-center"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            title="Clear expression"
            className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.97] transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Scientific Tactile Keypad Grid (44px+ hitboxes) */}
      <div className="grid grid-cols-6 gap-1.5">
        {KEY_SETS[activeTab].map((keyDef) => (
          <button
            key={keyDef.label + keyDef.title}
            type="button"
            title={keyDef.title}
            onClick={() => insertToken(keyDef.insert, keyDef.cursorBack ?? 0)}
            className={`min-h-[44px] px-1.5 py-2 rounded-xl border text-sm font-medium transition-all active:scale-[0.96] flex items-center justify-center overflow-hidden ${
              keyDef.variant === 'operator'
                ? 'border-slate-200 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-800 text-blue-700 dark:text-blue-400 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80'
            }`}
          >
            {keyDef.latexDisplay ? (
              <MathDisplay latex={keyDef.latexDisplay} className="text-xs sm:text-sm pointer-events-none" />
            ) : (
              <span className="font-mono text-xs sm:text-sm">{keyDef.label}</span>
            )}
          </button>
        ))}
      </div>

      {/* Primary Solve Action */}
      <button
        type="button"
        onClick={onSolve}
        disabled={isSolving || !value.trim()}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm"
      >
        <CornerDownLeft className="w-4 h-4" />
        <span>{isSolving ? 'Solving Step-by-Step...' : 'Solve Equation'}</span>
      </button>
    </div>
  );
};
