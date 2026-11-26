export type MathDomain =
  | 'Algebra'
  | 'Calculus'
  | 'Trigonometry'
  | 'Linear Algebra'
  | 'Differential Equations'
  | 'Word Problem'
  | 'Statistics'
  | 'General';

export type InputTabMode = 'keyboard' | 'text' | 'camera';

export type AppNavTab = 'solver' | 'graphing' | 'history' | 'bookmarks' | 'download';

export interface MathStep {
  stepNumber: number;
  title: string;
  explanation: string;
  expressionLatex: string;
  ruleApplied: string;
}

export interface FormulaItem {
  id: string;
  name: string;
  latex: string;
  description: string;
  category: string;
  exampleProblem?: string;
}

export interface GraphPoint {
  x: number;
  y: number;
  label: string;
}

export interface GraphAsymptote {
  type: 'vertical' | 'horizontal';
  value: number;
  label: string;
}

export interface GraphConfig {
  supported: boolean;
  mode: '2d' | '3d' | 'inequality' | 'none';
  expressions: string[];
  inequality?: {
    lhs: string;
    rhs: string;
    op: '<' | '<=' | '>' | '>=';
  };
  expression3d?: string;
  xRange: [number, number];
  yRange: [number, number];
  roots: GraphPoint[];
  intercepts: GraphPoint[];
  asymptotes: GraphAsymptote[];
  notes: string;
}

export interface SymbolicVerification {
  verified: boolean;
  engine: string;
  method: string;
  computedSummary: string;
}

export interface SolveResponse {
  id: string;
  timestamp: number;
  problemInput: string;
  domain: MathDomain;
  normalizedProblemLatex: string;
  finalAnswerLatex: string;
  finalAnswerPlain: string;
  symbolicCheck: SymbolicVerification;
  steps: MathStep[];
  formulasUsed: FormulaItem[];
  graphConfig: GraphConfig;
}

export interface OcrResponse {
  extractedLatex: string;
  plainExpression: string;
  problemDescription: string;
  confidenceNote: string;
}

export interface HistoryItem extends SolveResponse {
  sourceMode: InputTabMode;
}
