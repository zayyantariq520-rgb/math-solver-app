import type { FormulaItem, MathDomain } from '../types/math.ts';

export interface SampleProblem {
  id: string;
  domain: MathDomain;
  title: string;
  expression: string;
  latex: string;
}

export const SAMPLE_PROBLEMS: SampleProblem[] = [
  {
    id: 'sample-calc-int',
    domain: 'Calculus',
    title: 'Definite Integral',
    expression: 'Integrate (3*x^2 - 4*x + 5) dx from 0 to 3',
    latex: '\\int_{0}^{3} (3x^2 - 4x + 5)\\,dx',
  },
  {
    id: 'sample-alg-quad',
    domain: 'Algebra',
    title: 'Quadratic Roots & Parabola',
    expression: '2*x^2 - 5*x - 3 = 0',
    latex: '2x^2 - 5x - 3 = 0',
  },
  {
    id: 'sample-trig',
    domain: 'Trigonometry',
    title: 'Damped Harmonic Wave',
    expression: 'Find roots and graph f(x) = exp(-0.15*x) * sin(2*x) on [-2, 10]',
    latex: 'f(x) = e^{-0.15x}\\sin(2x)',
  },
  {
    id: 'sample-linalg',
    domain: 'Linear Algebra',
    title: '2x2 Matrix Eigenvalues',
    expression: 'Find eigenvalues and eigenvectors of matrix [[4, 1], [2, 3]]',
    latex: 'A = \\begin{pmatrix} 4 & 1 \\\\ 2 & 3 \\end{pmatrix}',
  },
  {
    id: 'sample-ode',
    domain: 'Differential Equations',
    title: 'Second-Order Linear ODE',
    expression: "Solve y'' - 3*y' + 2*y = 0 with y(0) = 1, y'(0) = 0",
    latex: "y'' - 3y' + 2y = 0, \\quad y(0)=1,\\; y'(0)=0",
  },
  {
    id: 'sample-3d',
    domain: 'Calculus',
    title: '3D Saddle Surface',
    expression: 'Analyze critical points and plot 3D surface z = x^2 - y^2',
    latex: 'z = x^2 - y^2',
  },
  {
    id: 'sample-word',
    domain: 'Word Problem',
    title: 'Projectile Optimization',
    expression:
      'A rocket is launched vertically so its height in meters after t seconds is h(t) = -4.9*t^2 + 39.2*t + 12. Find the maximum height and when it hits the ground.',
    latex: 'h(t) = -4.9t^2 + 39.2t + 12',
  },
];

export const DEFAULT_BOOKMARKS: FormulaItem[] = [
  {
    id: 'bm-quadratic',
    name: 'Quadratic Formula',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    description: 'Solves any standard quadratic equation ax^2 + bx + c = 0 where a is nonzero.',
    category: 'Algebra',
    exampleProblem: '2*x^2 - 5*x - 3 = 0',
  },
  {
    id: 'bm-ibp',
    name: 'Integration by Parts',
    latex: '\\int u\\,dv = uv - \\int v\\,du',
    description: 'Transforms the integral of a product of functions into a simpler integral.',
    category: 'Calculus',
    exampleProblem: 'Integrate x * exp(x) dx',
  },
  {
    id: 'bm-euler',
    name: "Euler's Formula",
    latex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta',
    description: 'Connects complex exponential functions with trigonometric functions.',
    category: 'Trigonometry',
    exampleProblem: 'Simplify exp(i * pi) + 1',
  },
  {
    id: 'bm-chain',
    name: 'Chain Rule',
    latex: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)',
    description: 'Computes the derivative of a composition of two differentiable functions.',
    category: 'Calculus',
    exampleProblem: 'd/dx(sin(x^2 + 1))',
  },
  {
    id: 'bm-eigen',
    name: 'Characteristic Polynomial',
    latex: '\\det(A - \\lambda I) = 0',
    description: 'Determines the eigenvalues of a square linear transformation matrix A.',
    category: 'Linear Algebra',
    exampleProblem: 'Find eigenvalues of [[4, 1], [2, 3]]',
  },
  {
    id: 'bm-cosines',
    name: 'Law of Cosines',
    latex: 'c^2 = a^2 + b^2 - 2ab\\cos(C)',
    description: 'Relates the lengths of the sides of any triangle to the cosine of one angle.',
    category: 'Trigonometry',
    exampleProblem: 'Triangle with sides a=7, b=10, and angle C=60 degrees. Find side c.',
  },
];
