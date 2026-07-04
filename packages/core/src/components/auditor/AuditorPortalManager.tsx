import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Shield,
  Link,
  Copy,
  Clock,
  User,
  Mail,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

interface AuditorPortalManagerProps {
  clientId: number;
}

export default function AuditorPortalManager({ clientId }: AuditorPortalManagerProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [auditorEmail, setAuditorEmail] = useState("");
  const [auditorName, setAuditorName] = useState("");
  const [expiryPreset, setExpiryPreset] = useState("168");
  const [customHours, setCustomHours] = useState("");
  const [scope, setScope] = useState("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = trpc.auditorPortal.getActiveSessions.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  const createSessionMutation = trpc.auditorPortal.createSession.useMutation({
    onSuccess: (data: any) => {
      toast.success("Auditor access link created");
      setIsCreateDialogOpen(false);
      refetchSessions();
      setCopiedToken(data.token);
      // Copy the link to clipboard
      const link = `https://app.grcompliance.com/auditor/${data.token}`;
      navigator.clipboard.writeText(link).then(() => {
        toast.success("Auditor link copied to clipboard");
      }).catch(() => {
        // fallback: show the link
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeSessionMutation = trpc.auditorPortal.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked");
      refetchSessions();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setAuditorEmail("");
    setAuditorName("");
    setExpiryPreset("168");
    setCustomHours("");
    setScope("all");
  };

  const getExpiryHours = () => {
    if (expiryPreset === "custom") {
      return parseInt(customHours) || 168;
    }
    return parseInt(expiryPreset);
  };

  const handleCreate = () => {
    const expiresInHours = getExpiryHours();
    createSessionMutation.mutate({
      clientId,
      expiresInHours,
      scope: scope !== "all" ? scope : undefined,
      auditorEmail: auditorEmail || undefined,
      auditorName: auditorName || undefined,
    });
  };

  const handleCopyLink = (token: string) => {
    const link = `https://app.grcompliance.com/auditor/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedToken(null), 2000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getExpiryStatus = (expiresAt: Date | string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 0) return { label: "Expired", variant: "destructive" as const };
    if (diffHours <= 24) return { label: `${Math.round(diffHours)}h left`, variant: "warning" as const };
    if (diffHours <= 168) return { label: `${Math.round(diffHours / 24)}d left`, variant: "secondary" as const };
    return { label: `${Math.round(diffHours / 24)}d left`, variant: "outline" as const };
  };

  const maskToken = (token: string) => {
    if (token.length <= 12) return token;
    return `${token.slice(0, 8)}...${token.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Auditor Portal Access
            </CardTitle>
            <CardDescription>
              Create time-limited, read-only access links for external auditors
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Link className="w-4 h-4 mr-2" />
                Create Auditor Access
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Auditor Access Link</DialogTitle>
                <DialogDescription>
                  Generate a time-limited, read-only link for your auditor.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="auditorEmail">Auditor Email</Label>
                  <Input
                    id="auditorEmail"
                    placeholder="auditor@example.com"
                    value={auditorEmail}
                    onChange={(e) => setAuditorEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auditorName">Auditor Name</Label>
                  <Input
                    id="auditorName"
                    placeholder="Jane Smith"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiry">Expires In</Label>
                  <Select value={expiryPreset} onValueChange={setExpiryPreset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 Hours</SelectItem>
                      <SelectItem value="72">3 Days</SelectItem>
                      <SelectItem value="168">7 Days</SelectItem>
                      <SelectItem value="720">30 Days</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {expiryPreset === "custom" && (
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      className="mt-2"
                      min={1}
                      max={720}
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Controls</SelectItem>
                      <SelectItem value="framework">By Framework</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? "Creating..." : "Create Link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session: any) => {
                  const status = getExpiryStatus(session.expiresAt);
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">
                          {maskToken(session.token)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {session.auditorName || <span className="text-slate-400 italic">Unnamed</span>}
                          </span>
                          {session.auditorEmail && (
                            <span className="text-xs text-slate-500">{session.auditorEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(session.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.expiresAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(session.token)}
                            title="Copy auditor link"
                          >
                            {copiedToken === session.token ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => revokeSessionMutation.mutate({ token: session.token })}
                            title="Revoke access"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Eye className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-1">No active auditor sessions</p>
              <p className="text-sm">Create an auditor access link to share with external auditors.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copied link notification banner */}
      {copiedToken && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Auditor link copied: <code className="px-1 py-0.5 bg-green-100 rounded text-xs">
                  https://app.grcompliance.com/auditor/{maskToken(copiedToken)}
                </code>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCopiedToken(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
