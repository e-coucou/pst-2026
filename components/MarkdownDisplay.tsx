'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

/**
 * Composant pour afficher du markdown stylisé selon la charte graphique PST
 * Utilise @tailwindcss/typography pour la mise en forme
 */
export function MarkdownDisplay({ content, className = '' }: MarkdownDisplayProps) {
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          // Personnalisation des balises HTML générées par le markdown
          h1: ({ children }) => (
            <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white mb-8">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white mt-12 mb-6 border-t border-white/10 pt-6">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-red-600 mt-8 mb-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl font-black uppercase tracking-widest text-white mt-6 mb-3">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-base text-gray-300 leading-relaxed mb-4">
              {children}
            </p>
          ),
          a: ({ children, href }) => (
            <a 
              href={href}
              className="text-red-600 hover:text-red-500 underline decoration-red-600/30 hover:decoration-red-600 transition-colors font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-gray-300 space-y-2 my-4 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-gray-300 space-y-2 my-4 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-300">
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border border-white/10">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-800/50 border-b border-white/10">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-white font-black uppercase tracking-wider text-xs border-r border-white/10">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-white/10 hover:bg-zinc-900/30 transition-colors">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-gray-300 border-r border-white/10 last:border-r-0">
              {children}
            </td>
          ),
          // CORRECTION ICI : Suppression de 'inline' des arguments
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            
            // Si on n'a pas de classe language-xxx, c'est du code "inline"
            const isInline = !match;

            if (isInline) {
              return (
                <code className="bg-zinc-900 text-red-600 px-2 py-1 rounded font-mono text-sm border border-red-600/20">
                  {children}
                </code>
              );
            }

            return (
              <div className="my-6 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden">
                {lang && (
                  <div className="bg-zinc-800/50 px-4 py-2 border-b border-white/10">
                    <span className="text-xs text-red-600 font-bold uppercase tracking-widest">
                      {lang}
                    </span>
                  </div>
                )}
                <pre className="overflow-x-auto">
                  <code className="text-red-600 font-mono text-sm p-4 block" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-red-600 pl-6 my-6 italic text-gray-400 bg-zinc-900/20 py-4">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-8 border-white/10" />
          ),
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt} 
              className="max-w-full h-auto rounded-lg my-6 border border-white/10"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}