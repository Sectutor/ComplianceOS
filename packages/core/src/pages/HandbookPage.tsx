import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@complianceos/ui/ui/input";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Badge } from "@complianceos/ui/ui/badge";
import { BookOpen, Search, ChevronRight, ChevronDown, Menu, X } from "lucide-react";

interface Chapter {
  num: number;
  title: string;
  content: string;
}

interface Part {
  title: string;
  chapters: Chapter[];
}

function parseManuscript(md: string): Part[] {
  const parts: Part[] = [];
  const partBlocks = md.split(/(?=^## Part)/m);

  for (const block of partBlocks) {
    const partMatch = block.match(/^## (Part [^:]+: .+)/m);
    if (!partMatch) continue;

    const chapters: Chapter[] = [];
    const chapterBlocks = block.split(/(?=^### Chapter)/m);

    for (const cb of chapterBlocks) {
      const chMatch = cb.match(/^### Chapter (\d+): (.+)/m);
      if (!chMatch) continue;
      const num = parseInt(chMatch[1]);
      const title = chMatch[2].trim();
      const lines = cb.split("\n");
      const startIdx = lines.findIndex(l => l.startsWith("### Chapter"));
      const content = lines.slice(startIdx + 1).join("\n").trim();
      chapters.push({ num, title, content });
    }

    if (chapters.length > 0) {
      parts.push({ title: partMatch[1].trim(), chapters });
    }
  }
  return parts;
}

export default function HandbookPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const [md, setMd] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState<{ partIdx: number; chIdx: number } | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/handbook/manuscript.md")
      .then(r => r.text())
      .then(text => {
        setMd(text);
        setLoading(false);
      });
  }, []);

  const parts = useMemo(() => parseManuscript(md), [md]);

  // Auto-select first chapter on load
  useEffect(() => {
    if (parts.length > 0 && !currentChapter) {
      setCurrentChapter(parts[0].chapters.length > 0 ? { partIdx: 0, chIdx: 0 } : null);
    }
  }, [parts, currentChapter]);

  const activeChapter = currentChapter ? parts[currentChapter.partIdx]?.chapters[currentChapter.chIdx] : null;
  const activePart = currentChapter ? parts[currentChapter.partIdx] : null;

  // Search across all chapters
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { partIdx: number; chIdx: number; num: number; title: string; snippet: string }[] = [];
    for (let pi = 0; pi < parts.length; pi++) {
      for (let ci = 0; ci < parts[pi].chapters.length; ci++) {
        const ch = parts[pi].chapters[ci];
        const idx = ch.content.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(ch.content.length, idx + q.length + 120);
          const snippet = (start > 0 ? "…" : "") + ch.content.slice(start, end).replace(/\n/g, " ") + (end < ch.content.length ? "…" : "");
          results.push({ partIdx: pi, chIdx: ci, num: ch.num, title: ch.title, snippet });
        }
      }
    }
    return results;
  }, [search, parts]);

  const navigateTo = useCallback((pi: number, ci: number) => {
    setCurrentChapter({ partIdx: pi, chIdx: ci });
    setSidebarOpen(false);
    setSearch("");
  }, []);

  // Render markdown content as simple HTML
  const renderContent = (text: string) => {
    let html = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-5 mb-2 text-slate-800">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-2 text-slate-900">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-slate-900">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-2 text-slate-900">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-sm font-mono">$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-2">$1</blockquote>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal text-slate-700">$2</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc text-slate-700">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-3 text-slate-700 leading-relaxed">')
      .replace(/\n/g, ' ');
    html = '<p class="mb-3 text-slate-700 leading-relaxed">' + html + '</p>';
    // Fix nested paragraphs from list items
    html = html.replace(/<\/li><p/g, '<\/li><li><p').replace(/<\/p><li/g, '<\/li><li');
    return html;
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "block" : "hidden"} lg:block w-72 border-r bg-white shrink-0 overflow-hidden`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search chapters..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {searchResults !== null ? (
              <div className="p-3 space-y-2">
                <p className="text-xs text-slate-400 font-medium mb-2">{searchResults.length} results</p>
                {searchResults.slice(0, 50).map(r => (
                  <button key={`${r.partIdx}-${r.chIdx}`} onClick={() => navigateTo(r.partIdx, r.chIdx)}
                    className="w-full text-left p-2 rounded hover:bg-slate-50 text-sm">
                    <span className="font-medium text-blue-600">Ch {r.num}: {r.title}</span>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                  </button>
                ))}
                {searchResults.length === 0 && <p className="text-sm text-slate-400 p-2">No matches found</p>}
              </div>
            ) : (
              <nav className="p-2 space-y-1">
                {parts.map((part, pi) => (
                  <div key={pi}>
                    <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">
                      {pi === currentChapter?.partIdx ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {part.title.replace("Part ", "P").split(":")[0]}
                    </div>
                    {part.chapters.map((ch, ci) => (
                      <button
                        key={ch.num}
                        onClick={() => navigateTo(pi, ci)}
                        className={`w-full text-left px-4 py-1.5 rounded text-sm transition-colors ${
                          currentChapter?.partIdx === pi && currentChapter?.chIdx === ci
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Ch {ch.num}: {ch.title.length > 40 ? ch.title.slice(0, 40) + "…" : ch.title}
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            )}
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b z-10 px-4 py-2 flex items-center gap-3 lg:hidden">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-slate-100 rounded">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm font-medium truncate">{activeChapter ? `Ch ${activeChapter.num}: ${activeChapter.title}` : "Handbook"}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">Loading handbook...</div>
          ) : activeChapter ? (
            <article className="max-w-3xl mx-auto px-4 py-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">{activePart?.title}</Badge>
                <span className="text-xs text-slate-400">Chapter {activeChapter.num}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-6">{activeChapter.title}</h1>
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: renderContent(activeChapter.content) }}
              />

              {/* Chapter navigation */}
              <div className="flex items-center justify-between mt-12 pt-6 border-t">
                <div>
                  {currentChapter && (
                    currentChapter.chIdx > 0 ? (
                      <button onClick={() => setCurrentChapter({ partIdx: currentChapter.partIdx, chIdx: currentChapter.chIdx - 1 })}
                        className="text-sm text-blue-600 hover:underline">
                        ← Ch {parts[currentChapter.partIdx].chapters[currentChapter.chIdx - 1].num}: {parts[currentChapter.partIdx].chapters[currentChapter.chIdx - 1].title.length > 40 ? parts[currentChapter.partIdx].chapters[currentChapter.chIdx - 1].title.slice(0, 40) + "…" : parts[currentChapter.partIdx].chapters[currentChapter.chIdx - 1].title}
                      </button>
                    ) : currentChapter.partIdx > 0 && parts[currentChapter.partIdx - 1].chapters.length > 0 ? (
                      <button onClick={() => setCurrentChapter({ partIdx: currentChapter.partIdx - 1, chIdx: parts[currentChapter.partIdx - 1].chapters.length - 1 })}
                        className="text-sm text-blue-600 hover:underline">
                        ← Previous Part
                      </button>
                    ) : null
                  )}
                </div>
                <div>
                  {currentChapter && currentChapter.chIdx < parts[currentChapter.partIdx].chapters.length - 1 ? (
                    <button onClick={() => setCurrentChapter({ partIdx: currentChapter.partIdx, chIdx: currentChapter.chIdx + 1 })}
                      className="text-sm text-blue-600 hover:underline">
                      Ch {parts[currentChapter.partIdx].chapters[currentChapter.chIdx + 1].num}: {parts[currentChapter.partIdx].chapters[currentChapter.chIdx + 1].title.length > 40 ? parts[currentChapter.partIdx].chapters[currentChapter.chIdx + 1].title.slice(0, 40) + "…" : parts[currentChapter.partIdx].chapters[currentChapter.chIdx + 1].title} →
                    </button>
                  ) : currentChapter.partIdx < parts.length - 1 ? (
                    <button onClick={() => setCurrentChapter({ partIdx: currentChapter.partIdx + 1, chIdx: 0 })}
                      className="text-sm text-blue-600 hover:underline">
                      Next Part →
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No chapter selected</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
