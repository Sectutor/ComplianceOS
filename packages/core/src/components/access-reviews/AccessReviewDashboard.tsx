"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@complianceos/ui/ui/table";
import { Progress } from "@complianceos/ui/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  History,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Campaign {
  id: number;
  name: string;
  scope: string;
  scopeValue?: string;
  dueDate: string | Date;
  status: string;
  progress?: {
    total: number;
    pending: number;
    approved: number;
    revoked: number;
    modified: number;
    progressPercent: number;
  };
}

interface PendingReview {
  id: number;
  campaignId: number;
  revieweeName?: string;
  revieweeDepartment?: string;
  revieweeRole?: string;
  campaignName?: string;
}

interface HistoryEntry {
  id: number;
  userId: number;
  action: string;
  reviewedBy: number;
  reviewedAt: string | Date;
  details?: Record<string, any>;
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface AccessReviewDashboardProps {
  clientId: number;
}

// ──────────────────────────────────────────────
// Helper Components
// ──────────────────────────────────────────────

function DaysOverdueBadge({ dueDate }: { dueDate: string | Date }) {
  const due = new Date(dueDate);
  const now = new Date();
  const daysOverdue = Math.floor(
    (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOverdue <= 0) return null;

  return (
    <Badge variant="destructive" className="ml-2">
      {daysOverdue}d overdue
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
}

// ──────────────────────────────────────────────
// Main Dashboard Component
// ──────────────────────────────────────────────

export function AccessReviewDashboard({
  clientId,
}: AccessReviewDashboardProps) {
  // ── Data ──────────────────────────────────
  const { data: campaignsData, isLoading: campaignsLoading } =
    trpc.accessReviews.listCampaigns.useQuery({ clientId });

  const { data: pendingData, isLoading: pendingLoading } =
    trpc.accessReviews.getPendingReviews.useQuery({});

  const { data: overdueData, isLoading: overdueLoading } =
    trpc.accessReviews.getOverdueCampaigns.useQuery(
      { clientId },
      { enabled: false } // Only fetch if needed
    );

  const { data: historyData, isLoading: historyLoading } =
    trpc.accessReviews.getHistory.useQuery({ clientId, limit: 20 });

  // ── Mutations ─────────────────────────────
  const utils = trpc.useUtils();
  const submitReviewMutation = trpc.accessReviews.submitReview.useMutation({
    onSuccess: () => {
      utils.accessReviews.getPendingReviews.invalidate();
      utils.accessReviews.getHistory.invalidate();
      utils.accessReviews.listCampaigns.invalidate();
    },
  });

  const sendRemindersMutation = trpc.accessReviews.sendReminders.useMutation({
    onSuccess: () => {
      utils.accessReviews.listCampaigns.invalidate();
    },
  });

  const createCampaignMutation = trpc.accessReviews.createCampaign.useMutation(
    {
      onSuccess: () => {
        utils.accessReviews.listCampaigns.invalidate();
        setCreateDialogOpen(false);
      },
    }
  );

  // ── Local State ───────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(
    null
  );
  const [reviewStatus, setReviewStatus] = useState<string>("approved");
  const [reviewJustification, setReviewJustification] = useState("");

  // ── Create Campaign State ─────────────────
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignScope, setNewCampaignScope] = useState<string>("all");
  const [newCampaignScopeValue, setNewCampaignScopeValue] = useState("");
  const [newCampaignDueDate, setNewCampaignDueDate] = useState("");
  const [newCampaignReviewerIds, setNewCampaignReviewerIds] = useState<
    number[]
  >([]);

  // ── Campaign Detail Dialog ────────────────
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  const openCampaignDetail = (campaign: Campaign) => {
    setDetailCampaign(campaign);
    setDetailDialogOpen(true);
  };

  // ── Submit Review Handler ─────────────────
  const handleSubmitReview = () => {
    if (!selectedReview) return;
    submitReviewMutation.mutate({
      assignmentId: selectedReview.id,
      status: reviewStatus as "approved" | "revoked" | "modified",
      justification:
        reviewStatus === "approved" ? undefined : reviewJustification,
    });
    setReviewDialogOpen(false);
    setSelectedReview(null);
    setReviewJustification("");
    setReviewStatus("approved");
  };

  // ── Create Campaign Handler ───────────────
  const handleCreateCampaign = () => {
    if (!newCampaignName || !newCampaignDueDate) return;
    createCampaignMutation.mutate({
      clientId,
      name: newCampaignName,
      scope: newCampaignScope as "all" | "department" | "role",
      scopeValue: newCampaignScopeValue || undefined,
      dueDate: new Date(newCampaignDueDate),
      reviewerIds: newCampaignReviewerIds,
    });
    setNewCampaignName("");
    setNewCampaignScope("all");
    setNewCampaignScopeValue("");
    setNewCampaignDueDate("");
    setNewCampaignReviewerIds([]);
  };

  // ── Bulk Approve ─────────────────────────
  const handleApproveAll = () => {
    if (!pendingData) return;
    pendingData.forEach((review: PendingReview) => {
      submitReviewMutation.mutate({
        assignmentId: review.id,
        status: "approved",
      });
    });
  };

  // ── Send Reminders Handler ────────────────
  const handleSendReminders = (campaignId: number) => {
    sendRemindersMutation.mutate({ campaignId });
  };

  // ── Overdue Campaigns ─────────────────────
  // Derive overdue from campaigns data
  const overdueCampaigns = (campaignsData || []).filter((c: Campaign) => {
    if (c.status !== "active") return false;
    const due = new Date(c.dueDate);
    return due < new Date();
  });

  // =============================================
  // RENDER
  // =============================================

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Access Reviews
        </h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Access Review Campaign</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <Input
                  placeholder="e.g., Q3 2026 Access Review"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Scope</label>
                <Select
                  value={newCampaignScope}
                  onValueChange={setNewCampaignScope}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="department">
                      By Department
                    </SelectItem>
                    <SelectItem value="role">By Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newCampaignScope !== "all" && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {newCampaignScope === "department"
                      ? "Department Name"
                      : "Role Name"}
                  </label>
                  <Input
                    placeholder={
                      newCampaignScope === "department"
                        ? "e.g., Engineering"
                        : "e.g., Developer"
                    }
                    value={newCampaignScopeValue}
                    onChange={(e) => setNewCampaignScopeValue(e.target.value)}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newCampaignDueDate}
                  onChange={(e) => setNewCampaignDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Reviewer IDs (comma-separated)
                </label>
                <Input
                  placeholder="e.g., 1, 2, 3"
                  value={newCampaignReviewerIds.join(", ")}
                  onChange={(e) =>
                    setNewCampaignReviewerIds(
                      e.target.value
                        .split(",")
                        .map((s) => parseInt(s.trim(), 10))
                        .filter((n) => !isNaN(n))
                    )
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Active Campaigns ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (campaignsData || []).filter(
              (c: Campaign) => c.status === "active"
            ).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active campaigns.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(campaignsData || [])
                .filter((c: Campaign) => c.status === "active")
                .map((campaign: Campaign) => (
                  <Card
                    key={campaign.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => openCampaignDetail(campaign)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Scope: {campaign.scope}
                            {campaign.scopeValue && ` - ${campaign.scopeValue}`}
                          </p>
                        </div>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Due: {new Date(campaign.dueDate).toLocaleDateString()}
                      </p>
                      {campaign.progress && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {campaign.progress.approved +
                                campaign.progress.revoked +
                                campaign.progress.modified}{" "}
                              / {campaign.progress.total} reviewed
                            </span>
                            <span className="font-medium">
                              {campaign.progress.progressPercent}%
                            </span>
                          </div>
                          <Progress
                            value={campaign.progress.progressPercent}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── My Pending Reviews ────────────── */}
      {pendingData && pendingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              My Pending Reviews
              <Badge variant="secondary" className="ml-2">
                {pendingData.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleApproveAll}
                disabled={submitReviewMutation.isPending}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Approve All
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingData.map((review: PendingReview) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.revieweeName || `User #${review.id}`}
                    </TableCell>
                    <TableCell>
                      {review.revieweeDepartment || "-"}
                    </TableCell>
                    <TableCell>{review.revieweeRole || "-"}</TableCell>
                    <TableCell>{review.campaignName || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            submitReviewMutation.mutate({
                              assignmentId: review.id,
                              status: "approved",
                            });
                          }}
                        >
                          <UserCheck className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedReview(review);
                            setReviewStatus("revoked");
                            setReviewJustification("");
                            setReviewDialogOpen(true);
                          }}
                        >
                          <UserX className="mr-1 h-4 w-4" />
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Overdue Campaigns ─────────────── */}
      {overdueCampaigns.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Overdue Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueCampaigns.map((campaign: Campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">{campaign.name}</span>
                      <DaysOverdueBadge dueDate={campaign.dueDate} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(campaign.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendReminders(campaign.id)}
                    disabled={sendRemindersMutation.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent History ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Review History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !historyData || historyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No review history yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historyData as HistoryEntry[]).map(
                  (entry: HistoryEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        User #{entry.userId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.action === "approved"
                              ? "default"
                              : entry.action === "revoked"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>User #{entry.reviewedBy}</TableCell>
                      <TableCell>
                        {new Date(entry.reviewedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Review Justification Dialog ───── */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {reviewStatus === "revoked" ? "Revoke Access" : "Modify Access"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Review Decision
              </label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reviewStatus !== "approved" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Justification
                </label>
                <Textarea
                  placeholder="Please provide a reason for this decision..."
                  value={reviewJustification}
                  onChange={(e) => setReviewJustification(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitReview}>Submit Review</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Campaign Detail Dialog ────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {detailCampaign?.name || "Campaign Details"}
            </DialogTitle>
          </DialogHeader>
          {detailCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Scope</p>
                  <p className="font-medium">
                    {detailCampaign.scope}
                    {detailCampaign.scopeValue &&
                      ` - ${detailCampaign.scopeValue}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={detailCampaign.status} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {new Date(detailCampaign.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Days Remaining
                  </p>
                  <p className="font-medium">
                    {Math.max(
                      0,
                      Math.floor(
                        (new Date(detailCampaign.dueDate).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )}{" "}
                    days
                  </p>
                </div>
              </div>
              {detailCampaign.progress && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Progress</p>
                  <Progress
                    value={detailCampaign.progress.progressPercent}
                  />
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <p className="font-medium text-blue-600">
                        {detailCampaign.progress.pending}
                      </p>
                      <p className="text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-600">
                        {detailCampaign.progress.approved}
                      </p>
                      <p className="text-muted-foreground">Approved</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-600">
                        {detailCampaign.progress.revoked}
                      </p>
                      <p className="text-muted-foreground">Revoked</p>
                    </div>
                    <div>
                      <p className="font-medium text-orange-600">
                        {detailCampaign.progress.modified}
                      </p>
                      <p className="text-muted-foreground">Modified</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
