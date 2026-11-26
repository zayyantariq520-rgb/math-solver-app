import React, { useEffect, useMemo, useRef, useState } from 'react';
import { create, all } from 'mathjs';
import { ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, Box, LineChart } from 'lucide-react';
import type { GraphConfig, GraphPoint } from '../types/math.ts';

const math = create(all, { number: 'number', precision: 12 });

const CURVE_COLORS = [
  '#2563eb', // Cobalt
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Coral
  '#7c3aed', // Violet
];

interface GraphVisualizerProps {
  graphConfig?: GraphConfig;
  isDark: boolean;
  compact?: boolean;
}

function sanitizeExpr(raw: string): string {
  return raw
    .trim()
    .replace(/^[yz]\s*=\s*/i, '')
    .replace(/^f\(x\)\s*=\s*/i, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi');
}

function parseInequality(raw: string): {
  lhs: string;
  op: '<' | '<=' | '>' | '>=';
  rhs: string;
} | null {
  const m = raw.match(/^(.*?)\s*(<=|>=|<|>)\s*(.*)$/);
  if (!m) return null;
  return {
    lhs: m[1].trim(),
    op: m[2] as '<' | '<=' | '>' | '>=',
    rhs: m[3].trim(),
  };
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  graphConfig,
  isDark,
  compact = false,
}) => {
  const [mode, setMode] = useState<'2d' | '3d'>(
    graphConfig?.mode === '3d' ? '3d' : '2d'
  );
  const [expressions, setExpressions] = useState<string[]>(() => {
    if (graphConfig?.supported && graphConfig.expressions.length > 0) {
      return graphConfig.expressions;
    }
    if (graphConfig?.inequality) {
      const { lhs, op, rhs } = graphConfig.inequality;
      return [`${lhs} ${op} ${rhs}`];
    }
    return ['x^2 - 4', '2*x - 1'];
  });
  const [newExprInput, setNewExprInput] = useState('');
  const [expr3d, setExpr3d] = useState<string>(
    graphConfig?.expression3d || 'sin(sqrt(x^2 + y^2))'
  );

  // 2D Viewport state
  const [xRange, setXRange] = useState<[number, number]>(
    graphConfig?.xRange ?? [-8, 8]
  );
  const [yRange, setYRange] = useState<[number, number]>(
    graphConfig?.yRange ?? [-6, 6]
  );
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; curveY: number | null } | null>(
    null
  );

  // 3D Orbit state
  const [azimuth, setAzimuth] = useState(0.75);
  const [elevation, setElevation] = useState(0.55);
  const [zoom3d, setZoom3d] = useState(1);

  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);
  const drag2dRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const drag3dRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  // Sync incoming graphConfig from newly solved problems
  useEffect(() => {
    if (!graphConfig || !graphConfig.supported) return;
    if (graphConfig.mode === '3d') {
      setMode('3d');
      if (graphConfig.expression3d) setExpr3d(graphConfig.expression3d);
    } else {
      setMode('2d');
      if (graphConfig.inequality) {
        const { lhs, op, rhs } = graphConfig.inequality;
        setExpressions([`${lhs} ${op} ${rhs}`]);
      } else if (graphConfig.expressions.length > 0) {
        setExpressions(graphConfig.expressions);
      }
      if (graphConfig.xRange?.length === 2) setXRange(graphConfig.xRange);
      if (graphConfig.yRange?.length === 2) setYRange(graphConfig.yRange);
    }
  }, [graphConfig]);

  // Compile expressions safely
  const compiled2D = useMemo(() => {
    return expressions.map((raw, idx) => {
      const ineq = parseInequality(raw);
      if (ineq && ineq.lhs.toLowerCase() === 'y') {
        try {
          const fn = math.compile(sanitizeExpr(ineq.rhs));
          return {
            raw,
            color: CURVE_COLORS[idx % CURVE_COLORS.length],
            inequalityOp: ineq.op,
            fn,
            error: null as string | null,
          };
        } catch {
          return { raw, color: CURVE_COLORS[idx % CURVE_COLORS.length], fn: null, error: 'Invalid inequality' };
        }
      }
      try {
        const fn = math.compile(sanitizeExpr(raw));
        return {
          raw,
          color: CURVE_COLORS[idx % CURVE_COLORS.length],
          inequalityOp: null as '<' | '<=' | '>' | '>=' | null,
          fn,
          error: null as string | null,
        };
      } catch {
        return {
          raw,
          color: CURVE_COLORS[idx % CURVE_COLORS.length],
          inequalityOp: null,
          fn: null,
          error: 'Syntax error',
        };
      }
    });
  }, [expressions]);

  // Auto-computed roots / intercepts for primary expression if not provided
  const featurePoints = useMemo(() => {
    const roots: GraphPoint[] = [...(graphConfig?.roots ?? [])];
    const intercepts: GraphPoint[] = [...(graphConfig?.intercepts ?? [])];

    const primary = compiled2D[0];
    if (primary?.fn && roots.length === 0) {
      const steps = 120;
      const [xMin, xMax] = xRange;
      const dx = (xMax - xMin) / steps;
      let prevX = xMin;
      let prevY: number | null = null;
      try {
        const v = Number(primary.fn.evaluate({ x: prevX }));
        prevY = Number.isFinite(v) ? v : null;
      } catch {
        prevY = null;
      }

      for (let i = 1; i <= steps; i++) {
        const cx = xMin + i * dx;
        let cy: number | null = null;
        try {
          const v = Number(primary.fn.evaluate({ x: cx }));
          cy = Number.isFinite(v) ? v : null;
        } catch {
          cy = null;
        }
        if (prevY !== null && cy !== null && prevY * cy <= 0 && Math.abs(prevY - cy) < 50 && roots.length < 6) {
          const rx = Number(((prevX + cx) / 2).toFixed(2));
          if (!roots.some((r) => Math.abs(r.x - rx) < 0.15)) {
            roots.push({ x: rx, y: 0, label: `(${rx}, 0)` });
          }
        }
        prevX = cx;
        prevY = cy;
      }

      if (intercepts.length === 0 && xMin <= 0 && xMax >= 0) {
        try {
          const y0 = Number(primary.fn.evaluate({ x: 0 }));
          if (Number.isFinite(y0) && y0 >= yRange[0] && y0 <= yRange[1]) {
            intercepts.push({ x: 0, y: Number(y0.toFixed(2)), label: `(0, ${Number(y0.toFixed(2))})` });
          }
        } catch {
          // ignore
        }
      }
    }

    return { roots, intercepts };
  }, [compiled2D, graphConfig, xRange, yRange]);

  // Draw 2D Graph
  useEffect(() => {
    if (mode !== '2d') return;
    const canvas = canvas2dRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    const toPxX = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
    const toPxY = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;

    // Background
    ctx.fillStyle = isDark ? '#0b1120' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Compute adaptive grid step
    const spanX = xMax - xMin;
    const rawStep = spanX / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const step = norm < 1.5 ? mag : norm < 3.5 ? 2 * mag : norm < 7.5 ? 5 * mag : 10 * mag;

    // Minor/Major gridlines
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.25)';

    const startX = Math.ceil(xMin / step) * step;
    for (let x = startX; x <= xMax; x += step) {
      const px = toPxX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }

    const startY = Math.ceil(yMin / step) * step;
    for (let y = startY; y <= yMax; y += step) {
      const py = toPxY(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = isDark ? 'rgba(226, 232, 240, 0.45)' : 'rgba(51, 65, 85, 0.55)';
    ctx.lineWidth = 1.5;
    if (xMin <= 0 && xMax >= 0) {
      const axX = toPxX(0);
      ctx.beginPath();
      ctx.moveTo(axX, 0);
      ctx.lineTo(axX, h);
      ctx.stroke();
    }
    if (yMin <= 0 && yMax >= 0) {
      const axY = toPxY(0);
      ctx.beginPath();
      ctx.moveTo(0, axY);
      ctx.lineTo(w, axY);
      ctx.stroke();
    }

    // Tick labels
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    const axisY = yMin <= 0 && yMax >= 0 ? Math.min(Math.max(toPxY(0) + 14, 14), h - 6) : h - 8;
    for (let x = startX; x <= xMax; x += step) {
      if (Math.abs(x) < 1e-9) continue;
      const px = toPxX(x);
      ctx.fillText(Number(x.toFixed(2)).toString(), px, axisY);
    }

    ctx.textAlign = 'right';
    const axisX = xMin <= 0 && xMax >= 0 ? Math.min(Math.max(toPxX(0) - 6, 28), w - 6) : 34;
    for (let y = startY; y <= yMax; y += step) {
      if (Math.abs(y) < 1e-9) continue;
      const py = toPxY(y) + 4;
      ctx.fillText(Number(y.toFixed(2)).toString(), axisX, py);
    }

    // Asymptotes
    if (graphConfig?.asymptotes) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = isDark ? '#f87171' : '#dc2626';
      ctx.lineWidth = 1.25;
      for (const asym of graphConfig.asymptotes) {
        if (asym.type === 'vertical') {
          const px = toPxX(asym.value);
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        } else {
          const py = toPxY(asym.value);
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(w, py);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Plot curves & inequality regions
    const samples = Math.min(Math.max(Math.floor(w * 1.4), 240), 700);
    for (const item of compiled2D) {
      if (!item.fn) continue;
      const pts: Array<{ px: number; py: number; y: number } | null> = [];

      for (let i = 0; i <= samples; i++) {
        const x = xMin + (i / samples) * (xMax - xMin);
        try {
          const y = Number(item.fn.evaluate({ x }));
          if (!Number.isFinite(y) || Math.abs(y) > (yMax - yMin) * 20) {
            pts.push(null);
          } else {
            pts.push({ px: toPxX(x), py: toPxY(y), y });
          }
        } catch {
          pts.push(null);
        }
      }

      // Inequality shading
      if (item.inequalityOp) {
        ctx.save();
        ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.14)';
        ctx.beginPath();
        const fillToY = item.inequalityOp.startsWith('<') ? h : 0;
        let started = false;
        let lastPx = 0;
        for (const p of pts) {
          if (!p) continue;
          if (!started) {
            ctx.moveTo(p.px, fillToY);
            ctx.lineTo(p.px, p.py);
            started = true;
          } else {
            ctx.lineTo(p.px, p.py);
          }
          lastPx = p.px;
        }
        if (started) {
          ctx.lineTo(lastPx, fillToY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Curve stroke
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.4;
      if (item.inequalityOp === '<' || item.inequalityOp === '>') {
        ctx.setLineDash([6, 5]);
      }
      ctx.beginPath();
      let drawing = false;
      let prevPy = 0;
      for (const p of pts) {
        if (!p) {
          drawing = false;
          continue;
        }
        if (!drawing || Math.abs(p.py - prevPy) > h * 0.85) {
          ctx.moveTo(p.px, p.py);
          drawing = true;
        } else {
          ctx.lineTo(p.px, p.py);
        }
        prevPy = p.py;
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw Roots & Intercepts markers
    const drawMarker = (pt: GraphPoint, fill: string) => {
      const px = toPxX(pt.x);
      const py = toPxY(pt.y);
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) return;

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDark ? '#0b1120' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
      ctx.fillText(pt.label, Math.min(px + 8, w - 75), Math.max(py - 8, 16));
    };

    featurePoints.roots.forEach((r) => drawMarker(r, '#10b981'));
    featurePoints.intercepts.forEach((iPt) => drawMarker(iPt, '#f59e0b'));

    // Hover crosshair
    if (hoverCoord) {
      const px = toPxX(hoverCoord.x);
      const py = toPxY(hoverCoord.curveY ?? hoverCoord.y);
      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      ctx.restore();

      if (hoverCoord.curveY !== null) {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [mode, compiled2D, xRange, yRange, isDark, graphConfig, featurePoints, hoverCoord]);

  // Draw 3D Surface
  useEffect(() => {
    if (mode !== '3d') return;
    const canvas = canvas3dRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = isDark ? '#0b1120' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    let compiled: math.EvalFunction | null = null;
    try {
      compiled = math.compile(sanitizeExpr(expr3d));
    } catch {
      ctx.fillStyle = isDark ? '#f87171' : '#dc2626';
      ctx.font = '13px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Enter a valid 3D surface expression in x and y, e.g. x^2 - y^2', w / 2, h / 2);
      return;
    }

    const N = 24;
    const range = 4;
    const scale = Math.min(w, h) * 0.082 * zoom3d;
    const cosA = Math.cos(azimuth);
    const sinA = Math.sin(azimuth);
    const cosE = Math.cos(elevation);
    const sinE = Math.sin(elevation);

    const project = (x: number, y: number, z: number) => {
      const rx = x * cosA - y * sinA;
      const ry = x * sinA + y * cosA;
      const rz = z;
      const py = ry * sinE - rz * cosE;
      const depth = ry * cosE + rz * sinE;
      return {
        sx: w / 2 + rx * scale,
        sy: h / 2 + py * scale,
        depth,
      };
    };

    const grid: Array<Array<{ x: number; y: number; z: number; sx: number; sy: number; depth: number }>> = [];
    let zMin = Infinity;
    let zMax = -Infinity;

    for (let i = 0; i <= N; i++) {
      const row = [];
      const x = -range + (i / N) * (range * 2);
      for (let j = 0; j <= N; j++) {
        const y = -range + (j / N) * (range * 2);
        let z = 0;
        try {
          const val = Number(compiled.evaluate({ x, y }));
          z = Number.isFinite(val) ? Math.max(-6, Math.min(6, val)) : 0;
        } catch {
          z = 0;
        }
        zMin = Math.min(zMin, z);
        zMax = Math.max(zMax, z);
        const p = project(x, y, z);
        row.push({ x, y, z, ...p });
      }
      grid.push(row);
    }

    const zSpan = Math.max(zMax - zMin, 0.001);

    // Painter's algorithm sorted quads
    const quads: Array<{
      pts: Array<{ sx: number; sy: number }>;
      depth: number;
      normZ: number;
    }> = [];

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const p00 = grid[i][j];
        const p10 = grid[i + 1][j];
        const p11 = grid[i + 1][j + 1];
        const p01 = grid[i][j + 1];
        const avgDepth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
        const avgZ = (p00.z + p10.z + p11.z + p01.z) / 4;
        quads.push({
          pts: [p00, p10, p11, p01],
          depth: avgDepth,
          normZ: (avgZ - zMin) / zSpan,
        });
      }
    }

    quads.sort((a, b) => a.depth - b.depth);

    for (const q of quads) {
      const t = Math.max(0, Math.min(1, q.normZ));
      const r = Math.round(30 + t * 29);
      const g = Math.round(64 + t * 145);
      const b = Math.round(175 + t * 70);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 0.7;

      ctx.beginPath();
      ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
      ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
      ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
      ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3D Axis Triad
    const origin = project(0, 0, 0);
    const axes = [
      { to: project(range + 0.6, 0, 0), label: 'X', color: '#ef4444' },
      { to: project(0, range + 0.6, 0), label: 'Y', color: '#10b981' },
      { to: project(0, 0, 4.5), label: 'Z', color: '#3b82f6' },
    ];
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    for (const ax of axes) {
      ctx.strokeStyle = ax.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(ax.to.sx, ax.to.sy);
      ctx.stroke();
      ctx.fillStyle = ax.color;
      ctx.fillText(ax.label, ax.to.sx + 5, ax.to.sy + 4);
    }
  }, [mode, expr3d, azimuth, elevation, zoom3d, isDark]);

  const zoom2D = (factor: number) => {
    const cx = (xRange[0] + xRange[1]) / 2;
    const cy = (yRange[0] + yRange[1]) / 2;
    const hx = ((xRange[1] - xRange[0]) / 2) * factor;
    const hy = ((yRange[1] - yRange[0]) / 2) * factor;
    setXRange([cx - hx, cx + hx]);
    setYRange([cy - hy, cy + hy]);
  };

  const resetView = () => {
    if (mode === '2d') {
      setXRange(graphConfig?.xRange ?? [-8, 8]);
      setYRange(graphConfig?.yRange ?? [-6, 6]);
    } else {
      setAzimuth(0.75);
      setElevation(0.55);
      setZoom3d(1);
    }
  };

  const handleAddExpr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExprInput.trim()) return;
    setExpressions((prev) => [...prev, newExprInput.trim()]);
    setNewExprInput('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Toolbar Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setMode('2d')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              mode === '2d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>2D Curves</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('3d')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              mode === '3d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Surface</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => (mode === '2d' ? zoom2D(0.75) : setZoom3d((z) => Math.min(2.2, z * 1.15)))}
            aria-label="Zoom in"
            className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => (mode === '2d' ? zoom2D(1.33) : setZoom3d((z) => Math.max(0.5, z * 0.85)))}
            aria-label="Zoom out"
            className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Reset viewport"
            className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas Viewport */}
      <div className="relative">
        {mode === '2d' ? (
          <canvas
            ref={canvas2dRef}
            className={`w-full block cursor-crosshair touch-none ${
              compact ? 'h-64 sm:h-72' : 'h-80 sm:h-[420px]'
            }`}
            onMouseDown={(e) => {
              drag2dRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
            }}
            onMouseMove={(e) => {
              const canvas = canvas2dRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();

              if (drag2dRef.current.active) {
                const dxPx = e.clientX - drag2dRef.current.lastX;
                const dyPx = e.clientY - drag2dRef.current.lastY;
                drag2dRef.current.lastX = e.clientX;
                drag2dRef.current.lastY = e.clientY;
                const dxMath = (dxPx / rect.width) * (xRange[1] - xRange[0]);
                const dyMath = (dyPx / rect.height) * (yRange[1] - yRange[0]);
                setXRange([xRange[0] - dxMath, xRange[1] - dxMath]);
                setYRange([yRange[0] + dyMath, yRange[1] + dyMath]);
                return;
              }

              const mx = xRange[0] + ((e.clientX - rect.left) / rect.width) * (xRange[1] - xRange[0]);
              const my = yRange[1] - ((e.clientY - rect.top) / rect.height) * (yRange[1] - yRange[0]);
              let curveY: number | null = null;
              if (compiled2D[0]?.fn) {
                try {
                  const val = Number(compiled2D[0].fn.evaluate({ x: mx }));
                  if (Number.isFinite(val)) curveY = val;
                } catch {
                  curveY = null;
                }
              }
              setHoverCoord({ x: mx, y: my, curveY });
            }}
            onMouseUp={() => {
              drag2dRef.current.active = false;
            }}
            onMouseLeave={() => {
              drag2dRef.current.active = false;
              setHoverCoord(null);
            }}
            onWheel={(e) => {
              e.preventDefault();
              zoom2D(e.deltaY > 0 ? 1.12 : 0.89);
            }}
          />
        ) : (
          <canvas
            ref={canvas3dRef}
            className={`w-full block cursor-grab active:cursor-grabbing touch-none ${
              compact ? 'h-64 sm:h-72' : 'h-80 sm:h-[420px]'
            }`}
            onPointerDown={(e) => {
              drag3dRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!drag3dRef.current.active) return;
              const dx = e.clientX - drag3dRef.current.lastX;
              const dy = e.clientY - drag3dRef.current.lastY;
              drag3dRef.current.lastX = e.clientX;
              drag3dRef.current.lastY = e.clientY;
              setAzimuth((a) => a + dx * 0.01);
              setElevation((el) => Math.max(-1.4, Math.min(1.4, el + dy * 0.01)));
            }}
            onPointerUp={() => {
              drag3dRef.current.active = false;
            }}
            onPointerLeave={() => {
              drag3dRef.current.active = false;
            }}
          />
        )}

        {/* Live Coordinate Telemetry Overlay */}
        {mode === '2d' && hoverCoord && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 font-mono text-xs tabular-nums text-slate-800 dark:text-slate-200 backdrop-blur-sm">
            x: {hoverCoord.x.toFixed(2)}
            {hoverCoord.curveY !== null ? ` · f(x): ${hoverCoord.curveY.toFixed(3)}` : ''}
          </div>
        )}

        {mode === '3d' && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 backdrop-blur-sm">
            Drag to orbit 3D surface
          </div>
        )}
      </div>

      {/* Expression Controls Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-3">
        {mode === '2d' ? (
          <>
            <div className="space-y-2">
              {compiled2D.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                    {item.inequalityOp ? '' : `y${idx + 1} =`}
                  </span>
                  <input
                    type="text"
                    value={expressions[idx]}
                    onChange={(e) => {
                      const next = [...expressions];
                      next[idx] = e.target.value;
                      setExpressions(next);
                    }}
                    className="flex-1 min-w-0 bg-transparent font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  {item.error && (
                    <span className="text-xs text-red-600 dark:text-red-400 shrink-0">
                      {item.error}
                    </span>
                  )}
                  {expressions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpressions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove curve"
                      className="min-h-[32px] min-w-[32px] rounded-lg text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddExpr} className="flex items-center gap-2">
              <input
                type="text"
                value={newExprInput}
                onChange={(e) => setNewExprInput(e.target.value)}
                placeholder="Add function or inequality (e.g. sin(x), y <= x^2 - 1)"
                className="flex-1 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
              <button
                type="submit"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Plot</span>
              </button>
            </form>

            {(featurePoints.roots.length > 0 ||
              featurePoints.intercepts.length > 0 ||
              (graphConfig?.asymptotes?.length ?? 0) > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                {featurePoints.roots.length > 0 && (
                  <span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-medium">
                      Roots:
                    </strong>{' '}
                    <span className="font-mono tabular-nums">
                      {featurePoints.roots.map((r) => r.label).join(', ')}
                    </span>
                  </span>
                )}
                {featurePoints.intercepts.length > 0 && (
                  <span>
                    <strong className="text-amber-700 dark:text-amber-400 font-medium">
                      Y-Intercept:
                    </strong>{' '}
                    <span className="font-mono tabular-nums">
                      {featurePoints.intercepts.map((i) => i.label).join(', ')}
                    </span>
                  </span>
                )}
                {graphConfig?.asymptotes && graphConfig.asymptotes.length > 0 && (
                  <span>
                    <strong className="text-red-700 dark:text-red-400 font-medium">
                      Asymptotes:
                    </strong>{' '}
                    <span className="font-mono tabular-nums">
                      {graphConfig.asymptotes.map((a) => a.label).join(', ')}
                    </span>
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                z = f(x, y) =
              </span>
              <input
                type="text"
                value={expr3d}
                onChange={(e) => setExpr3d(e.target.value)}
                placeholder="sin(sqrt(x^2 + y^2))"
                className="flex-1 min-w-0 bg-transparent font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'Saddle', expr: 'x^2 - y^2' },
                { label: 'Ripple', expr: 'sin(sqrt(x^2 + y^2))' },
                { label: 'Wave Grid', expr: 'cos(x) * sin(y)' },
                { label: 'Paraboloid', expr: '(x^2 + y^2) / 5' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setExpr3d(preset.expr)}
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
