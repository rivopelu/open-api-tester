import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { Button } from '../ui';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const textContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline code
  if (!match && !String(children).includes('\n')) {
    return (
      <code
        className="rounded-none bg-overlay px-1.5 py-0.5 font-mono text-[12px] text-teal border border-border/60"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Multi-line code block
  return (
    <div className="relative my-3 overflow-hidden border border-border bg-base text-xs font-mono">
      <div className="flex items-center justify-between border-b border-border/80 bg-surface px-3 py-1.5 text-[11px] text-text-muted">
        <span className="font-semibold uppercase tracking-wider text-text-secondary">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-[11px] gap-1 font-normal text-text-muted hover:text-text-primary"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto p-3 text-text-primary">
        <pre className="m-0 leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose-sm max-w-none text-text-primary ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="my-3 font-heading text-lg font-bold text-text-primary">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="my-2.5 font-heading text-[15px] font-semibold text-text-primary">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="my-2 font-heading text-sm font-semibold text-text-primary">
              {children}
            </h3>
          ),
          // Paragraphs & text
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed text-[13px] text-text-primary last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text-secondary">{children}</em>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-4 text-[13px] text-text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-4 text-[13px] text-text-primary">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary bg-surface/50 py-1 pl-3 text-[13px] italic text-text-secondary">
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto border border-border">
              <table className="w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border bg-surface text-text-primary font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border bg-base text-text-secondary">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-card/40">{children}</tr>,
          th: ({ children }) => <th className="p-2.5 font-semibold text-text-primary">{children}</th>,
          td: ({ children }) => <td className="p-2.5">{children}</td>,
          // Code & Links
          code: CodeBlock,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
