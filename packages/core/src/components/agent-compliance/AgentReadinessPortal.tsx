import { useEffect, useState } from "react";

interface ReadinessData {
  agent: { id: number; name: string; type: string; version: string; overallScore: number; owaspCoverage: number };
  score: {
    overallScore: number;
    owaspCoverage: number;
    frameworkScores: Record<string, { total: number; covered: number; score: number }>;
    perControl: Array<{ framework: string; controlId: string; confidence: number; source: string; explanation: string }>;
    gaps: Array<{ framework: string; controlId: string; confidence: number }>;
    evidenceCount: number;
    redteamPassRate: number;
  };
  policyCards: any[];
  tasks: any[];
  scoreHistory: any[];
  mappings: any[];
  evidenceCount: number;
  redteamStats: { pass: number; fail: number };
}

export default function AgentReadinessPortal({ token }: { token: string }) {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/agent-compliance/portal/${token}/readiness`, { headers: {} })
      .then((r) => { if (!r.ok) throw new Error("Invalid or expired link"); return r.json(); })
      .then((j) => setData(j.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!data) return null;

  const { agent, score, policyCards, tasks, scoreHistory, mappings, evidenceCount, redteamStats } = data;

  const scoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 50 ? "text-yellow-600" : "text-red-600";
  const barColor = (s: number) => s >= 80 ? "bg-green-500" : s >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-slate-500">Agent Compliance Readiness Portal</p>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-bold ${scoreColor(score.overallScore)}`}>{score.overallScore}%</div>
            <div className="text-sm text-slate-500">Overall Score</div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(score.frameworkScores).map(([fw, d]: [string, any]) => (
            <div key={fw} className="bg-white rounded-lg p-4 shadow">
              <div className="text-xs text-slate-500 mb-1">{fw.replace(/_/g, " ")}</div>
              <div className={`text-2xl font-bold ${scoreColor(d.score)}`}>{d.score}%</div>
              <div className="w-full h-2 bg-slate-200 rounded mt-2"><div className={`h-full rounded ${barColor(d.score)}`} style={{ width: `${d.score}%` }} /></div>
              <div className="text-xs text-slate-400 mt-1">{d.covered}/{d.total} controls covered</div>
            </div>
          ))}
        </div>

        {/* OWASP + Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-3">OWASP LLM Top 10</h3>
            <div className="space-y-2">
              {score.perControl.filter(p => p.framework === "OWASP_LLM").map(p => (
                <div key={p.controlId} className="flex items-center justify-between text-sm">
                  <span>{p.controlId} - {p.explanation.substring(0, 40)}</span>
                  <span className={`font-mono ${scoreColor(p.confidence)}`}>{p.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-3">Evidence & Testing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Evidence Items:</span><span className="font-bold">{evidenceCount}</span></div>
              <div className="flex justify-between"><span>Red Team Pass:</span><span className="font-bold text-green-600">{redteamStats.pass}</span></div>
              <div className="flex justify-between"><span>Red Team Fail:</span><span className="font-bold text-red-600">{redteamStats.fail}</span></div>
              <div className="flex justify-between"><span>Gaps Open:</span><span className="font-bold text-yellow-600">{score.gaps.length}</span></div>
              <div className="flex justify-between"><span>OWASP Coverage:</span><span className="font-bold">{score.owaspCoverage}%</span></div>
            </div>
          </div>
          {policyCards.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold mb-3">Policy Card</h3>
              <div className="text-sm space-y-1">
                <div><strong>{policyCards[0].name}</strong></div>
                <div>Status: <span className="badge badge-green">{policyCards[0].status}</span></div>
                <div>EU AI Act: {policyCards[0].aiActRiskLevel}</div>
                <div>Uses: {(policyCards[0].intendedUses || []).join(", ") || "None specified"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks + History */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-3">Open Remediation Tasks ({tasks.length})</h3>
            {tasks.length === 0 ? <p className="text-sm text-slate-500">No open tasks</p> : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex justify-between text-sm border-b pb-1">
                    <span>{t.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-3">Score History</h3>
            {scoreHistory.length === 0 ? <p className="text-sm text-slate-500">No history yet</p> : (
              <div className="flex items-end gap-1 h-24">
                {scoreHistory.slice(-12).map((h: any, i: number) => (
                  <div key={i} className={`flex-1 rounded-t ${barColor(h.overall_score)}`} style={{ height: `${h.overall_score}%` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
