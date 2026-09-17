import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Terminal, Code2, AlertCircle, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";

interface RichMarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export function RichMarkdownMessage({ content, isUser = false }: RichMarkdownMessageProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-sans text-xs">{content}</div>;
  }

  return (
    <div className="rich-agent-message text-xs leading-relaxed space-y-2 text-foreground break-words">
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-base font-bold text-foreground mt-3 mb-1.5 pb-1 border-b border-border flex items-center gap-1.5" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm font-bold text-foreground mt-3 mb-1 pb-0.5 border-b border-border/60 flex items-center gap-1.5" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-bold text-primary mt-2.5 mb-1 flex items-center gap-1 tracking-wide uppercase" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-semibold text-foreground mt-2 mb-0.5" {...props} />
          ),

          // Paragraphs & text
          p: ({ node, ...props }) => <p className="mb-2 leading-relaxed text-foreground/90" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-foreground/80" {...props} />,

          // Lists
          ul: ({ node, ...props }) => <ul className="space-y-1 my-2 pl-4 list-disc marker:text-primary" {...props} />,
          ol: ({ node, ...props }) => <ol className="space-y-1 my-2 pl-4 list-decimal marker:text-primary font-medium" {...props} />,
          li: ({ node, ...props }) => <li className="pl-0.5 leading-relaxed text-foreground/90" {...props} />,

          // Blockquotes / Alerts
          blockquote: ({ node, children, ...props }) => {
            return (
              <blockquote className="my-2.5 border-l-2 border-primary/60 bg-primary/5 dark:bg-primary/10 rounded-r-lg px-3 py-2 text-[11px] text-foreground/90 shadow-2xs">
                {children}
              </blockquote>
            );
          },

          // Horizontal rule
          hr: ({ node, ...props }) => <hr className="my-3 border-border" {...props} />,

          // Tables
          table: ({ node, ...props }) => (
            <div className="my-2.5 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[11px] text-left divide-y divide-border" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-muted/60 text-foreground font-semibold" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-border/50 bg-background" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
          th: ({ node, ...props }) => <th className="px-2.5 py-1.5 font-semibold text-foreground" {...props} />,
          td: ({ node, ...props }) => <td className="px-2.5 py-1.5 text-foreground/90" {...props} />,

          // Code blocks & Inline code
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && (match || codeString.includes("\n") || codeString.length > 40)) {
              return <CodeBlock language={language} code={codeString} />;
            }

            return (
              <code className="font-mono text-[11px] bg-muted/80 text-primary px-1.5 py-0.5 rounded border border-border/80 font-medium" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-lg border border-border bg-muted/30 overflow-hidden shadow-2xs font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border text-muted-foreground text-[10px]">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span className="uppercase font-semibold tracking-wider text-foreground">
            {language || "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-background/80"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto bg-card text-foreground leading-relaxed">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
