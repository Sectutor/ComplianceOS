import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@complianceos/ui/ui/dialog';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import { Download, Printer, X, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { FrameworkRoadmapSpec } from '@/data/frameworkRoadmaps';

interface RoadmapExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: FrameworkRoadmapSpec;
  clientId: number;
  completedTasks: Record<string, boolean>;
  gates?: Record<number, { passed: boolean; passedBy?: string; passedAt?: string }>;
  targetAuditDate?: string | null;
}

function escapeCSV(val: string | undefined | null): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function RoadmapExportModal({
  isOpen,
  onClose,
  spec,
  clientId,
  completedTasks,
  gates = {},
  targetAuditDate,
}: RoadmapExportModalProps) {

  const totalTasks = spec.months.reduce((acc, m) => acc + m.tasks.length, 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleCSVExport = () => {
    try {
      const headers = [
        'Issue Type',
        'Summary',
        'Description',
        'Sprint / Month',
        'Status',
        'Regulatory Reference',
        'Action CTA',
        'Action Link',
      ];

      const rows: string[][] = [];

      spec.months.forEach((month) => {
        month.tasks.forEach((task) => {
          const isDone = !!completedTasks[task.id];
          rows.push([
            'Task',
            task.title,
            task.desc || '',
            `Month ${month.month}: ${month.title}`,
            isDone ? 'Done' : 'To Do',
            task.articleRef || month.clauseRef || '',
            task.cta || '',
            task.link && task.link !== '#' ? `http://localhost:5173${task.link}` : '',
          ]);
        });
      });

      const csvLines = [
        headers.map(escapeCSV).join(','),
        ...rows.map((r) => r.map(escapeCSV).join(',')),
      ];

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${spec.id}-90day-roadmap.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="w-4 h-4 text-primary" />
            Export Roadmap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-bold bg-primary/5 text-primary border-primary/20">
                {spec.frameworkBadge}
              </Badge>
              <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                90-Day Sprint
              </Badge>
            </div>
            <div className="text-sm font-semibold text-foreground">{spec.title}</div>
            <div className="grid grid-cols-3 gap-2 text-center mt-2">
              <div className="bg-background rounded-lg border border-border p-2">
                <div className="text-lg font-black text-foreground">{totalTasks}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Total Tasks</div>
              </div>
              <div className="bg-background rounded-lg border border-border p-2">
                <div className="text-lg font-black text-emerald-600">{completedCount}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Completed</div>
              </div>
              <div className="bg-background rounded-lg border border-border p-2">
                <div className="text-lg font-black text-primary">{progressPct}%</div>
                <div className="text-[10px] text-muted-foreground font-medium">Progress</div>
              </div>
            </div>
            {targetAuditDate && (
              <div className="text-[11px] text-muted-foreground">
                🎯 Target Audit Date:{' '}
                <span className="font-semibold text-foreground">
                  {new Date(targetAuditDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Export options */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Export Options</p>

            {/* Jira/Linear CSV */}
            <button
              onClick={handleCSVExport}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  Jira / Linear CSV
                </div>
                <div className="text-xs text-muted-foreground">
                  Import all {totalTasks} tasks into your project management tool
                </div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>

            {/* Executive Print */}
            <button
              onClick={handlePrint}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  Executive Print View
                </div>
                <div className="text-xs text-muted-foreground">
                  Print-optimised summary for board and audit committee
                </div>
              </div>
              <Printer className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
