import katex from 'katex';

export function renderLatexToHtml(latex: string, displayMode = false): string {
  const cleaned = latex
    .trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, '$1')
    .replace(/^\$([\s\S]*)\$$/, '$1')
    .trim();

  if (!cleaned) return '';

  try {
    return katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return '';
  }
}
