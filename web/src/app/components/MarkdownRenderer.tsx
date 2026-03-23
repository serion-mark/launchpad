'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1">{children}</h3>,
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            return isInline
              ? <code className="bg-black/20 rounded px-1 py-0.5 text-sm font-mono">{children}</code>
              : <code className="block bg-black/20 rounded-lg p-3 text-sm font-mono overflow-x-auto mb-2">{children}</code>;
          },
          pre: ({ children }) => <pre className="mb-2">{children}</pre>,
          table: ({ children }) => <table className="w-full border-collapse mb-2 text-sm">{children}</table>,
          th: ({ children }) => <th className="border border-white/20 px-2 py-1 text-left font-semibold bg-white/5">{children}</th>,
          td: ({ children }) => <td className="border border-white/20 px-2 py-1">{children}</td>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-white/30 pl-3 italic opacity-80 mb-2">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
