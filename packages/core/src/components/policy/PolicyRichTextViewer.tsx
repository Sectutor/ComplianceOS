import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, FileText, Code2, Eye } from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";

interface PolicyRichTextViewerProps {
    content: string;
    className?: string;
    maxHeight?: string;
    showRawToggle?: boolean;
}

export function PolicyRichTextViewer({
    content,
    className = "",
    maxHeight = "520px",
    showRawToggle = true,
}: PolicyRichTextViewerProps) {
    const [viewMode, setViewMode] = useState<"rich" | "raw">("rich");
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs ${className}`}>
            {showRawToggle && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs">
                    <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setViewMode("rich")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                                viewMode === "rich"
                                    ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Formatted Policy (Rich Text)
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("raw")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                                viewMode === "raw"
                                    ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                        >
                            <Code2 className="w-3.5 h-3.5" />
                            Raw Markdown
                        </button>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 gap-1.5"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Text</span>
                            </>
                        )}
                    </Button>
                </div>
            )}

            <div
                className="p-5 sm:p-7 overflow-y-auto select-text font-sans leading-relaxed text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900/60"
                style={{ maxHeight }}
            >
                {viewMode === "raw" ? (
                    <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
                        {content}
                    </pre>
                ) : (
                    <div className="policy-rich-document space-y-4">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ node, ...props }) => (
                                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 tracking-tight" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                    <h3 className="text-base font-bold text-blue-900 dark:text-blue-300 mt-5 mb-2 flex items-center gap-2" {...props} />
                                ),
                                h4: ({ node, ...props }) => (
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3" {...props} />
                                ),
                                strong: ({ node, ...props }) => (
                                    <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                                ),
                                em: ({ node, ...props }) => (
                                    <em className="italic text-slate-800 dark:text-slate-200" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                    <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                    <li className="leading-relaxed pl-1" {...props} />
                                ),
                                hr: ({ node, ...props }) => (
                                    <hr className="my-5 border-t border-slate-200 dark:border-slate-800" {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 my-3 rounded-r-lg text-xs italic text-blue-950 dark:text-blue-200" {...props} />
                                ),
                                table: ({ node, ...props }) => (
                                    <div className="my-4 overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900">
                                        <table className="w-full text-xs text-left border-collapse" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => (
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-300 dark:border-slate-700" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                    <th className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 last:border-r-0 tracking-wider text-[11px] uppercase" {...props} />
                                ),
                                tbody: ({ node, ...props }) => (
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900" {...props} />
                                ),
                                tr: ({ node, ...props }) => (
                                    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0" {...props} />
                                ),
                                code: ({ node, ...props }) => (
                                    <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700" {...props} />
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
