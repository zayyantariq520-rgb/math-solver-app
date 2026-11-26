import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  preAnalyzeProblem,
  verifySolutionWithMathJs,
  augment2DFeatures,
} from './server/mathEngine.ts';
import { buildProjectZip } from './server/zipBuilder.ts';
import type { SolveResponse, OcrResponse, MathDomain } from './src/types/math.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'axiomlab-math-server' });
  });

  app.get('/api/download-app', (_req, res) => {
    try {
      const zipBuffer = buildProjectZip(__dirname);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="axiomlab-math-solver.zip"'
      );
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to package app archive.';
      res.status(500).json({ error: message });
    }
  });

  // OCR Endpoint: Convert handwritten or printed equation photos into clean LaTeX & expression
  app.post('/api/ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body ?? {};
      if (typeof imageBase64 !== 'string' || imageBase64.length < 20) {
        res.status(400).json({ error: 'Please provide a valid image payload.' });
        return;
      }
      if (imageBase64.length > 8_500_000) {
        res.status(413).json({ error: 'Image is too large. Please upload an image under 6 MB.' });
        return;
      }
      const cleanMime = typeof mimeType === 'string' && ALLOWED_IMAGE_MIMES.has(mimeType.toLowerCase())
        ? mimeType.toLowerCase() === 'image/jpg'
          ? 'image/jpeg'
          : mimeType.toLowerCase()
        : 'image/jpeg';

      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
            {
              text:
                'Transcribe the mathematical problem, equation, matrix, integral, or word problem from this image accurately. ' +
                'Return clean KaTeX-compatible LaTeX, a plain mathjs-friendly expression (or full word problem text if it is a word problem), and a concise 1-sentence description of what was detected.',
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedLatex: {
                type: Type.STRING,
                description: 'KaTeX-compatible LaTeX string of the recognized math problem.',
              },
              plainExpression: {
                type: Type.STRING,
                description: 'Plain text or mathjs-friendly version of the equation/problem.',
              },
              problemDescription: {
                type: Type.STRING,
                description: 'Concise description of the detected math problem.',
              },
              confidenceNote: {
                type: Type.STRING,
                description: 'Brief note on legibility or assumptions made if handwritten.',
              },
            },
            required: [
              'extractedLatex',
              'plainExpression',
              'problemDescription',
              'confidenceNote',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as OcrResponse;
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract equation from image.';
      console.error('OCR error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Step-by-Step Math Solver Endpoint
  app.post('/api/solve', async (req, res) => {
    try {
      const { problem, problemLatex, domainHint } = req.body ?? {};
      if (typeof problem !== 'string' || !problem.trim()) {
        res.status(400).json({ error: 'Please enter a mathematical problem or equation to solve.' });
        return;
      }
      if (problem.length > 2500) {
        res.status(400).json({ error: 'Problem input must be under 2,500 characters.' });
        return;
      }

      const trimmedProblem = problem.trim();
      const preComputation = preAnalyzeProblem(trimmedProblem);

      const ai = getGeminiClient();
      const promptParts = [
        `Solve the following mathematical problem with complete rigor and step-by-step clarity.`,
        `Problem input: ${trimmedProblem}`,
      ];
      if (typeof problemLatex === 'string' && problemLatex.trim()) {
        promptParts.push(`Provided LaTeX representation: ${problemLatex.trim()}`);
      }
      if (typeof domainHint === 'string' && domainHint.trim()) {
        promptParts.push(`Suggested domain: ${domainHint.trim()}`);
      }
      if (preComputation) {
        promptParts.push(`Verified symbolic reference: ${preComputation}`);
      }

      promptParts.push(
        `Requirements:
1. Classify the domain accurately as one of: Algebra, Calculus, Trigonometry, Linear Algebra, Differential Equations, Word Problem, Statistics, General.
2. Provide clean KaTeX-compatible LaTeX in normalizedProblemLatex, finalAnswerLatex, step expressionLatex, and formula latex (do NOT wrap standalone LaTeX fields in $...$; inside prose 'explanation' strings you may wrap inline math in $...$).
3. Provide a plain-text mathjs-compatible finalAnswerPlain where possible (e.g. "x = 2, -3" or "3*x^2 + 2" or "42").
4. Break down the solution into clear, sequential logical steps with the specific rule or theorem applied at each step.
5. List 1 to 4 key Formulas / Theorems Used with clean LaTeX and concise descriptions.
6. Populate graphConfig accurately:
   - If the problem involves a function y = f(x), equation lhs = rhs (graphable as lhs - rhs or both sides), derivative/integral curve, or 2D inequality, set mode to "2d" or "inequality" and provide Math.js-compatible expressions in x (e.g. ["x^2 - 4", "0"] or ["sin(x)"]).
   - If it is a multivariable surface z = f(x, y) or 3D equation, set mode to "3d" and provide expression3d in x and y (e.g. "x^2 - y^2" or "sin(sqrt(x^2 + y^2))").
   - If purely numerical/abstract word problem with no natural curve, set supported: false and mode: "none".
   - Provide sensible xRange and yRange (e.g. [-10, 10]) plus known roots, intercepts, and asymptotes.`
      );

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptParts.join('\n\n'),
        config: {
          systemInstruction:
            'You are an authoritative university-level mathematics engine and educator. Be 100% accurate, concise, and mathematically rigorous. Output valid JSON strictly matching the schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              domain: {
                type: Type.STRING,
                description:
                  'One of: Algebra, Calculus, Trigonometry, Linear Algebra, Differential Equations, Word Problem, Statistics, General',
              },
              normalizedProblemLatex: {
                type: Type.STRING,
                description: 'Clean LaTeX of the problem statement without surrounding $ delimiters.',
              },
              finalAnswerLatex: {
                type: Type.STRING,
                description: 'Highlighted final answer in clean LaTeX without surrounding $ delimiters.',
              },
              finalAnswerPlain: {
                type: Type.STRING,
                description: 'Plain-text or mathjs-compatible expression for the final answer.',
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    expressionLatex: { type: Type.STRING },
                    ruleApplied: { type: Type.STRING },
                  },
                  required: ['stepNumber', 'title', 'explanation', 'expressionLatex', 'ruleApplied'],
                },
              },
              formulasUsed: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    latex: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ['id', 'name', 'latex', 'description', 'category'],
                },
              },
              graphConfig: {
                type: Type.OBJECT,
                properties: {
                  supported: { type: Type.BOOLEAN },
                  mode: { type: Type.STRING },
                  expressions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  inequality: {
                    type: Type.OBJECT,
                    properties: {
                      lhs: { type: Type.STRING },
                      rhs: { type: Type.STRING },
                      op: { type: Type.STRING },
                    },
                    required: ['lhs', 'rhs', 'op'],
                  },
                  expression3d: { type: Type.STRING },
                  xRange: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                  },
                  yRange: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                  },
                  roots: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                      },
                      required: ['x', 'y', 'label'],
                    },
                  },
                  intercepts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                      },
                      required: ['x', 'y', 'label'],
                    },
                  },
                  asymptotes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        value: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                      },
                      required: ['type', 'value', 'label'],
                    },
                  },
                  notes: { type: Type.STRING },
                },
                required: [
                  'supported',
                  'mode',
                  'expressions',
                  'xRange',
                  'yRange',
                  'roots',
                  'intercepts',
                  'asymptotes',
                  'notes',
                ],
              },
            },
            required: [
              'domain',
              'normalizedProblemLatex',
              'finalAnswerLatex',
              'finalAnswerPlain',
              'steps',
              'formulasUsed',
              'graphConfig',
            ],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const aiResult = JSON.parse(rawJson);

      const xRange: [number, number] =
        Array.isArray(aiResult.graphConfig?.xRange) && aiResult.graphConfig.xRange.length === 2
          ? [Number(aiResult.graphConfig.xRange[0]) || -10, Number(aiResult.graphConfig.xRange[1]) || 10]
          : [-10, 10];
      const yRange: [number, number] =
        Array.isArray(aiResult.graphConfig?.yRange) && aiResult.graphConfig.yRange.length === 2
          ? [Number(aiResult.graphConfig.yRange[0]) || -10, Number(aiResult.graphConfig.yRange[1]) || 10]
          : [-10, 10];

      const expressions: string[] = Array.isArray(aiResult.graphConfig?.expressions)
        ? aiResult.graphConfig.expressions.filter((e: unknown) => typeof e === 'string' && e.trim().length > 0)
        : [];

      let roots = Array.isArray(aiResult.graphConfig?.roots) ? aiResult.graphConfig.roots : [];
      let intercepts = Array.isArray(aiResult.graphConfig?.intercepts)
        ? aiResult.graphConfig.intercepts
        : [];

      // Augment roots/intercepts numerically with Math.js if 2D expression exists
      if (aiResult.graphConfig?.supported && aiResult.graphConfig?.mode === '2d' && expressions.length > 0) {
        const computed = augment2DFeatures(expressions[0], xRange[0], xRange[1]);
        if (roots.length === 0 && computed.roots.length > 0) {
          roots = computed.roots;
        }
        if (intercepts.length === 0 && computed.intercepts.length > 0) {
          intercepts = computed.intercepts;
        }
      }

      const symbolicCheck = verifySolutionWithMathJs({
        problemInput: trimmedProblem,
        domain: aiResult.domain || 'General',
        finalAnswerPlain: aiResult.finalAnswerPlain || '',
        graphExpressions: expressions,
      });

      const solveResponse: SolveResponse = {
        id: `sol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        problemInput: trimmedProblem,
        domain: (aiResult.domain as MathDomain) || 'General',
        normalizedProblemLatex: aiResult.normalizedProblemLatex || trimmedProblem,
        finalAnswerLatex: aiResult.finalAnswerLatex || '',
        finalAnswerPlain: aiResult.finalAnswerPlain || '',
        symbolicCheck,
        steps: Array.isArray(aiResult.steps) ? aiResult.steps : [],
        formulasUsed: Array.isArray(aiResult.formulasUsed) ? aiResult.formulasUsed : [],
        graphConfig: {
          supported: Boolean(aiResult.graphConfig?.supported),
          mode: aiResult.graphConfig?.mode || 'none',
          expressions,
          inequality: aiResult.graphConfig?.inequality,
          expression3d: aiResult.graphConfig?.expression3d,
          xRange,
          yRange,
          roots,
          intercepts,
          asymptotes: Array.isArray(aiResult.graphConfig?.asymptotes)
            ? aiResult.graphConfig.asymptotes
            : [],
          notes: aiResult.graphConfig?.notes || '',
        },
      };

      res.json(solveResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to solve mathematical problem.';
      console.error('Solve error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AxiomLab server running on http://localhost:${PORT}`);
  });
}

startServer();
