import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@complianceos/ui/ui/collapsible";
import { ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";

export default function ChecklistsPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["checklists"],
    queryFn: () => fetch("/api/v1/checklists").then(r => r.json()),
  });

  const checklists = data?.data || [];

  const toggleItem = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const progress = (items: any[]) => {
    if (!items.length) return 0;
    return Math.round(items.filter((_: any, i: number) => checkedItems.has(`${openId}-${i}`)).length / items.length * 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Implementation Checklists</h1>
            <p className="text-sm text-muted-foreground">Track your AI compliance implementation progress</p>
          </div>
        </div>

        {isLoading && <div className="text-center py-12 text-muted-foreground">Loading checklists...</div>}

        <div className="space-y-4">
          {checklists.map((cl: any) => {
            const items = typeof cl.items === "string" ? JSON.parse(cl.items) : cl.items || [];
            const done = items.filter((_: any, i: number) => checkedItems.has(`${cl.checklist_id}-${i}`)).length;
            const total = items.length;
            return (
              <Collapsible key={cl.checklist_id} open={openId === cl.checklist_id} onOpenChange={(o) => setOpenId(o ? cl.checklist_id : null)} className="border rounded-lg bg-white shadow-sm">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {openId === cl.checklist_id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <div className="text-left">
                      <span className="font-medium">{cl.name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">{done}/{total} completed</div>
                    </div>
                  </div>
                  <Badge variant={done === total ? "default" : "secondary"} className={done === total ? "bg-green-100 text-green-800" : ""}>
                    {total > 0 ? Math.round(done/total*100) : 0}%
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t px-4 py-3">
                  <div className="space-y-2">
                    {items.map((item: any, i: number) => {
                      const key = `${cl.checklist_id}-${i}`;
                      const text = typeof item === "string" ? item : item.text || item.description || "";
                      return (
                        <div key={key} className="flex items-start gap-3 py-1.5">
                          <Checkbox
                            id={key}
                            checked={checkedItems.has(key)}
                            onCheckedChange={() => toggleItem(key)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={key}
                            className={`text-sm cursor-pointer select-none ${checkedItems.has(key) ? "line-through text-muted-foreground" : "text-foreground"}`}
                          >
                            {text}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {!isLoading && checklists.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No checklists found.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
