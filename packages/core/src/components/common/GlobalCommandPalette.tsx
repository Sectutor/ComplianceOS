import React, { useState, useEffect } from "react";
import { Search, Shield, Building2, FileText, AlertTriangle, Cpu, Layers, X, Command } from "lucide-react";
import { useLocation } from "wouter";

interface CommandItem {
  id: string;
  title: string;
  category: "Client" | "Framework" | "Policy" | "Module" | "Threat";
  icon: React.ReactNode;
  url: string;
}

export const GlobalCommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const items: CommandItem[] = [
    { id: "1", title: "Client Portfolio Governance", category: "Client", icon: <Building2 className="w-4 h-4 text-indigo-400" />, url: "/clients" },
    { id: "2", title: "MSSP Multi-Tenant Portal", category: "Module", icon: <Layers className="w-4 h-4 text-sky-400" />, url: "/mssp/portal" },
    { id: "3", title: "FedRAMP Moderate Baseline", category: "Framework", icon: <Shield className="w-4 h-4 text-emerald-400" />, url: "/frameworks" },
    { id: "4", title: "ISO/IEC 27001:2022 Annex A", category: "Framework", icon: <Shield className="w-4 h-4 text-emerald-400" />, url: "/frameworks" },
    { id: "5", title: "EU NIS2 Cybersecurity Directive", category: "Framework", icon: <Shield className="w-4 h-4 text-emerald-400" />, url: "/frameworks" },
    { id: "6", title: "CISA KEV Vulnerability Watcher", category: "Threat", icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, url: "/risks" },
    { id: "7", title: "Cloud Asset Auto-Discovery", category: "Module", icon: <Cpu className="w-4 h-4 text-amber-400" />, url: "/assets" },
    { id: "8", title: "Information Security Policy", category: "Policy", icon: <FileText className="w-4 h-4 text-violet-400" />, url: "/policies" },
  ];

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 space-y-0">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search (Clients, Frameworks, Controls, Threats)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
            <Command className="w-3 h-3" /> K
          </span>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setLocation(item.url);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-indigo-600/10 hover:border-indigo-500/30 border border-transparent text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/80 group-hover:bg-indigo-500/20 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-indigo-300">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-400">{item.url}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {item.category}
                </span>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              No matching commands or resources found for "{query}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Use ↑ ↓ to navigate</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
