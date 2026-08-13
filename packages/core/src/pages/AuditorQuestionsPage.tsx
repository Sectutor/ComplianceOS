import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { MessageSquare, Lightbulb, FileText, AlertTriangle } from "lucide-react";

const frameworks = ["All", "OWASP LLM Top 10", "OWASP ASI", "NIST AI RMF", "EU AI Act"];

export default function AuditorQuestionsPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const [framework, setFramework] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["auditor-questions", framework],
    queryFn: () => {
      const url = framework === "All" ? "/api/v1/auditor-questions" : `/api/v1/auditor-questions?framework=${encodeURIComponent(framework)}`;
      return fetch(url).then(r => r.json());
    },
  });

  const questions = data?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquareQuestion className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Auditor Question Bank</h1>
              <p className="text-sm text-muted-foreground">Prepare for audits with curated Q&A across all frameworks</p>
            </div>
          </div>
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by framework" />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map(fw => (
                <SelectItem key={fw} value={fw}>{fw}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="text-center py-12 text-muted-foreground">Loading questions...</div>}

        <div className="space-y-4">
          {questions.map((q: any) => (
            <Card key={q.id} className="bg-white shadow-sm border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{q.control_id || q.framework}</Badge>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">{q.framework}</Badge>
                    </div>
                    <CardTitle className="text-base font-medium mt-2">{q.question}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {q.auditor_intent && (
                  <div className="flex gap-2 p-3 bg-amber-50 rounded-md border border-amber-100">
                    <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-amber-800 text-xs uppercase tracking-wider">Auditor's Intent</span>
                      <p className="text-amber-900 mt-0.5">{q.auditor_intent}</p>
                    </div>
                  </div>
                )}
                {q.answer_guidance && (
                  <div className="flex gap-2 p-3 bg-green-50 rounded-md border border-green-100">
                    <FileText className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-green-800 text-xs uppercase tracking-wider">How to Answer</span>
                      <p className="text-green-900 mt-0.5">{q.answer_guidance}</p>
                    </div>
                  </div>
                )}
                {q.evidence_required && (
                  <div className="flex gap-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <FileText className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-blue-800 text-xs uppercase tracking-wider">Evidence to Produce</span>
                      <p className="text-blue-900 mt-0.5">{q.evidence_required}</p>
                    </div>
                  </div>
                )}
                {q.common_trap && (
                  <div className="flex gap-2 p-3 bg-red-50 rounded-md border border-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-red-800 text-xs uppercase tracking-wider">Common Trap</span>
                      <p className="text-red-900 mt-0.5">{q.common_trap}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && questions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No questions found for this framework.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
