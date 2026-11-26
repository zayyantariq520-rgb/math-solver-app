import React from 'react';
import { renderLatexToHtml } from '../utils/katexRender.ts';

interface MathDisplayProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathDisplay: React.FC<MathDisplayProps> = ({
  latex,
  displayMode = false,
  className = '',
}) => {
  const html = React.useMemo(
    () => renderLatexToHtml(latex, displayMode),
    [latex, displayMode]
  );

  if (!html) {
    return <span className={`font-mono text-sm ${className}`}>{latex}</span>;
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface MathProseProps {
  text: string;
  className?: string;
}

/**
 * Safely renders mixed natural language text containing $...$ or $$...$$ math segments
 * without passing plain prose through dangerouslySetInnerHTML.
 */
export const MathProse: React.FC<MathProseProps> = ({ text, className = '' }) => {
  const segments = React.useMemo(() => {
    const parts: Array<{ type: 'text' | 'inline' | 'display'; value: string }> = [];
    const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      }
      const token = match[0];
      if (token.startsWith('$$') && token.endsWith('$$')) {
        parts.push({ type: 'display', value: token.slice(2, -2) });
      } else {
        parts.push({ type: 'inline', value: token.slice(1, -1) });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return parts;
  }, [text]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
        }
        return (
          <MathDisplay
            key={idx}
            latex={seg.value}
            displayMode={seg.type === 'display'}
            className={seg.type === 'display' ? 'block my-2' : 'mx-0.5 inline-block align-middle'}
          />
        );
      })}
    </span>
  );
};
