import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Progress } from "@complianceos/ui/ui/progress";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MessageSquare,
  Send,
  Eye,
  Lock,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  XCircle,
} from "lucide-react";

interface AuditorDashboardProps {
  token: string;
}

interface Comment {
  id: number;
  sessionId: number;
  controlId: number | null;
  evidenceId: number | null;
  comment: string;
  authorName: string | null;
  createdAt: string | Date;
}

export default function AuditorDashboard({ token }: AuditorDashboardProps) {
  const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activeCommentSection, setActiveCommentSection] = useState<string | null>(null);

  const { data: dashboard, isLoading, error } = trpc.auditorPortal.getDashboard.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const addCommentMutation = trpc.auditorPortal.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      refetchComments();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: comments, refetch: refetchComments } = trpc.auditorPortal.getComments.useQuery(
    { token },
    { enabled: !!token }
  );

  // Redirect / show error if invalid token
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500 mb-6">
              This auditor link is invalid, expired, or has been revoked.
            </p>
            <p className="text-sm text-slate-400">
              Please contact your compliance team for a new access link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate session expiry from token — we don't have it in dashboard data, so use a placeholder
  // The actual expiry is handled server-side via getAuditorDashboard

  const toggleControl = (controlId: number) => {
    setExpandedControls((prev) => {
      const next = new Set(prev);
      if (next.has(controlId)) {
        next.delete(controlId);
      } else {
        next.add(controlId);
      }
      return next;
    });
  };

  const handleAddComment = (key: string, controlId?: number, evidenceId?: number) => {
    const comment = commentInputs[key];
    if (!comment || !comment.trim()) return;

    addCommentMutation.mutate({
      token,
      controlId,
      evidenceId,
      comment: comment.trim(),
    });

    setCommentInputs((prev) => ({ ...prev, [key]: "" }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "implemented":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Implemented</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case "not_implemented":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Not Implemented</Badge>;
      case "not_applicable":
        return <Badge variant="outline">N/A</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCommentsForControl = (controlId: number) => {
    return (comments || []).filter((c: Comment) => c.controlId === controlId && !c.evidenceId);
  };

  const getCommentsForEvidence = (evidenceId: number) => {
    return (comments || []).filter((c: Comment) => c.evidenceId === evidenceId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">{dashboard.clientName}</h1>
              <p className="text-sm text-slate-500">
                Compliance Audit Portal &mdash; {dashboard.framework}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-200 bg-amber-50">
            <Lock className="w-3 h-3" />
            Read-Only Access
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 font-medium mb-1">Compliance Score</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${getScoreColor(dashboard.complianceScore)}`}>
                  {dashboard.complianceScore}
                </span>
                <span className="text-lg text-slate-400">%</span>
              </div>
              <Progress
                value={dashboard.complianceScore}
                className={`h-2 mt-3 ${getScoreBarColor(dashboard.complianceScore)}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 font-medium mb-1">Total Controls</p>
              <p className="text-4xl font-bold text-slate-800">{dashboard.totalControls}</p>
              <p className="text-sm text-green-600 mt-3">
                {dashboard.implementedControls} implemented
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 font-medium mb-1">Evidence Items</p>
              <p className="text-4xl font-bold text-slate-800">{dashboard.evidenceCount}</p>
              <p className="text-sm text-slate-500 mt-3">
                Supporting documentation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 font-medium mb-1">Recent Snapshots</p>
              <p className="text-4xl font-bold text-slate-800">{dashboard.recentSnapshots}</p>
              <p className="text-sm text-slate-500 mt-3">
                Changes in last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Controls & Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.controls && dashboard.controls.length > 0 ? (
              dashboard.controls.map((control: any) => {
                const isExpanded = expandedControls.has(control.id);
                const controlComments = getCommentsForControl(control.id);
                const commentKey = `control-${control.id}`;

                return (
                  <div key={control.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Control Header */}
                    <button
                      onClick={() => toggleControl(control.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {control.controlId}: {control.name}
                          </p>
                          <p className="text-xs text-slate-500">{control.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {control.evidence?.length || 0} evidence
                        </Badge>
                        {getStatusBadge(control.status)}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        {/* Evidence List */}
                        {control.evidence && control.evidence.length > 0 ? (
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Attached Evidence
                            </p>
                            {control.evidence.map((ev: any) => {
                              const evComments = getCommentsForEvidence(ev.id);
                              const evCommentKey = `evidence-${ev.id}`;

                              return (
                                <div key={ev.id} className="bg-white border border-slate-200 rounded-md p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-blue-500" />
                                      <span className="text-sm font-medium">{ev.fileName}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {ev.status}
                                    </Badge>
                                  </div>
                                  {ev.collectedAt && (
                                    <p className="text-xs text-slate-500 mb-2">
                                      Collected: {new Date(ev.collectedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                  {ev.expirationDate && (
                                    <p className="text-xs text-amber-600 mb-2">
                                      Expires: {new Date(ev.expirationDate).toLocaleDateString()}
                                    </p>
                                  )}

                                  {/* Evidence Comments */}
                                  {evComments.length > 0 && (
                                    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                                      <p className="text-xs font-medium text-slate-500">Comments:</p>
                                      {evComments.map((c: Comment) => (
                                        <div key={c.id} className="text-xs bg-slate-50 rounded p-2">
                                          <p className="text-slate-700">{c.comment}</p>
                                          <p className="text-slate-400 mt-1">
                                            {c.authorName || "Auditor"} &mdash; {new Date(c.createdAt).toLocaleString()}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Evidence Comment Input */}
                                  {activeCommentSection === evCommentKey ? (
                                    <div className="mt-2 flex gap-2">
                                      <Textarea
                                        placeholder="Add a comment on this evidence..."
                                        className="text-xs min-h-[60px]"
                                        value={commentInputs[evCommentKey] || ""}
                                        onChange={(e) =>
                                          setCommentInputs((prev) => ({
                                            ...prev,
                                            [evCommentKey]: e.target.value,
                                          }))
                                        }
                                      />
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddComment(evCommentKey, undefined, ev.id)}
                                          disabled={addCommentMutation.isPending}
                                        >
                                          <Send className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setActiveCommentSection(null)}
                                        >
                                          <XCircle className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs mt-1"
                                      onClick={() => setActiveCommentSection(evCommentKey)}
                                    >
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      Comment
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-4 py-3">
                            <p className="text-xs text-slate-400 italic">No evidence attached</p>
                          </div>
                        )}

                        {/* Control-level Comments */}
                        {controlComments.length > 0 && (
                          <div className="px-4 pb-2 space-y-1">
                            <p className="text-xs font-semibold text-slate-500">Control Comments:</p>
                            {controlComments.map((c: Comment) => (
                              <div key={c.id} className="text-xs bg-white border border-slate-100 rounded p-2">
                                <p className="text-slate-700">{c.comment}</p>
                                <p className="text-slate-400 mt-0.5">
                                  {c.authorName || "Auditor"} &mdash; {new Date(c.createdAt).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Control Comment Input */}
                        {activeCommentSection === commentKey ? (
                          <div className="px-4 pb-3 flex gap-2">
                            <Textarea
                              placeholder="Add a comment on this control..."
                              className="text-xs min-h-[60px]"
                              value={commentInputs[commentKey] || ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [commentKey]: e.target.value,
                                }))
                              }
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(commentKey, control.id)}
                                disabled={addCommentMutation.isPending}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveCommentSection(null)}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 pb-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => setActiveCommentSection(commentKey)}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Add Comment
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No controls found</p>
                <p className="text-sm">This client has no controls assigned yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Summary */}
        {comments && comments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                All Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.map((c: Comment) => (
                <div key={c.id} className="border border-slate-100 rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{c.comment}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{c.authorName || "Auditor"}</span>
                        <span className="text-xs text-slate-400">&middot;</span>
                        <span className="text-xs text-slate-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      {c.controlId ? `Control #${c.controlId}` : c.evidenceId ? `Evidence #${c.evidenceId}` : "General"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          <Lock className="w-3 h-3 inline mr-1" />
          Read-only audit portal &mdash; Secured by ComplianceOS
        </div>
      </div>
    </div>
  );
}
