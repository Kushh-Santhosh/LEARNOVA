import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks: code blocks, tables, headers, lists, paragraphs
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-2 text-sm leading-relaxed text-inherit ${className}`}>
      {blocks.map((block, idx) => (
        <React.Fragment key={idx}>{renderBlock(block, idx)}</React.Fragment>
      ))}
    </div>
  );
}

interface Block {
  type: 'paragraph' | 'header' | 'code' | 'list' | 'table' | 'quote';
  level?: number;
  lang?: string;
  items?: string[];
  ordered?: boolean;
  headers?: string[];
  rows?: string[][];
  text?: string;
}

function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        lang: lang || 'text',
        text: codeLines.join('\n')
      });
      i++;
      continue;
    }

    // Headers: #, ##, ###
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      blocks.push({
        type: 'header',
        level: headerMatch[1].length,
        text: headerMatch[2].trim()
      });
      i++;
      continue;
    }

    // Markdown Table: lines starting and containing |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r.slice(1, -1).split('|').map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        const isDivider = (r: string) => /^[|\s-:]+$/.test(r);
        const dataLines = isDivider(tableLines[1]) ? tableLines.slice(2) : tableLines.slice(1);
        const rows = dataLines.map(parseRow);
        blocks.push({
          type: 'table',
          headers,
          rows
        });
        continue;
      }
    }

    // Blockquote: > text
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        text: quoteLines.join(' ')
      });
      continue;
    }

    // Unordered List: -, *, •
    if (/^\s*[-*•]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*•]\s+/, '').trim());
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items: listItems
      });
      continue;
    }

    // Ordered List: 1. text
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items: listItems
      });
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      pLines.push(lines[i].trim());
      i++;
    }
    blocks.push({
      type: 'paragraph',
      text: pLines.join(' ')
    });
  }

  return blocks;
}

function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case 'header': {
      const level = block.level || 2;
      const text = renderInline(block.text || '');
      if (level === 1) return <h2 key={key} className="text-lg font-bold text-slate-900 mt-3 mb-1 border-b pb-1 border-slate-200">{text}</h2>;
      if (level === 2) return <h3 key={key} className="text-base font-bold text-slate-900 mt-2.5 mb-1">{text}</h3>;
      if (level === 3) return <h4 key={key} className="text-sm font-semibold text-slate-900 mt-2 mb-0.5">{text}</h4>;
      return <h5 key={key} className="text-xs font-semibold text-slate-800 uppercase tracking-wide mt-1.5">{text}</h5>;
    }

    case 'code':
      return <CodeBlock key={key} code={block.text || ''} lang={block.lang || 'text'} />;

    case 'list': {
      const items = block.items || [];
      if (block.ordered) {
        return (
          <ol key={key} className="list-decimal pl-5 space-y-1 my-1.5 text-slate-800">
            {items.map((it, i) => (
              <li key={i}>{renderInline(it)}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={key} className="list-disc pl-5 space-y-1 my-1.5 text-slate-800">
          {items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    }

    case 'table':
      return (
        <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="min-w-full text-xs text-left text-slate-700">
            {block.headers && (
              <thead className="bg-slate-100 text-slate-900 font-semibold border-b border-slate-200">
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2">{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 bg-white">
              {block.rows?.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'quote':
      return (
        <blockquote key={key} className="my-2 pl-3 border-l-2 border-indigo-400 text-slate-600 italic text-xs">
          {renderInline(block.text || '')}
        </blockquote>
      );

    case 'paragraph':
    default:
      return <p key={key} className="text-slate-800 my-1">{renderInline(block.text || '')}</p>;
  }
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 text-[11px] font-mono text-slate-400 border-b border-slate-800">
        <span className="uppercase tracking-wider font-semibold text-slate-300">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-800"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  // Parses markdown inline tags:
  // `code`, **bold**, *italic*, [link](url)
  const tokens: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-indigo-700 border border-slate-200">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={match.index} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 underline font-medium"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="w-2.5 h-2.5 inline-block opacity-70" />
          </a>
        );
      } else {
        tokens.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}
