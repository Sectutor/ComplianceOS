import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Button } from "@complianceos/ui/ui/button";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

interface EvidenceExpiryWidgetProps {
  clientId?: number;
}

export default function EvidenceExpiryWidget({ clientId }: EvidenceExpiryWidgetProps) {
  const { data: stats, isLoading, error, refetch } = trpc.evidenceExpiry.getStats.useQuery(
    { clientId: clientId ?? 0 },
    { enabled: !!clientId }
  );

  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            Evidence Expiry Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-sm">Select a client to view evidence expiry data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            Evidence Expiry Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            Evidence Expiry Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <AlertTriangle className="h-12 w-12 mb-3" />
            <p className="text-sm">Failed to load evidence expiry data</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            Evidence Expiry Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <CheckCircle2 className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-sm">No evidence items tracked yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDaysLabel = (days: number): string => {
    if (days < 0) {
      const d = Math.abs(days);
      return `overdue by ${d} day${d !== 1 ? "s" : ""}`;
    }
    return `in ${days} day${days !== 1 ? "s" : ""}`;
  };

  const getStatusBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">Overdue</Badge>;
    if (days <= 30) return <Badge variant="warning" className="bg-amber-500 text-white">Expiring Soon</Badge>;
    if (days <= 90) return <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">Expiring</Badge>;
    return <Badge variant="outline">OK</Badge>;
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#1C4D8D]" />
            Evidence Expiry Overview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center cursor-pointer hover:bg-red-100 transition-colors">
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <div className="text-xs font-medium text-red-700 mt-1">Expired</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center cursor-pointer hover:bg-amber-100 transition-colors">
            <div className="text-2xl font-bold text-amber-600">{stats.expiring30}</div>
            <div className="text-xs font-medium text-amber-700 mt-1">Expiring &le;30d</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center cursor-pointer hover:bg-yellow-100 transition-colors">
            <div className="text-2xl font-bold text-yellow-600">{stats.expiring90}</div>
            <div className="text-xs font-medium text-yellow-700 mt-1">Expiring 31-90d</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="text-2xl font-bold text-gray-500">{stats.noExpiry}</div>
            <div className="text-xs font-medium text-gray-600 mt-1">No Expiry Set</div>
          </div>
        </div>

        {/* Urgent Items Table */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Most Urgent ({stats.urgentItems.length} of {stats.total} items)
          </h4>
          {stats.urgentItems.length > 0 ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold text-gray-600 py-2">Evidence ID</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 py-2">Owner</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 py-2">Control</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 py-2 text-right">Expiry</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 py-2 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.urgentItems.map((item) => (
                    <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-2.5 text-sm font-mono text-gray-800">
                        {item.evidenceId}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-600">
                        {item.owner || "\u2014"}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-600 max-w-[160px] truncate">
                        {item.controlName || "\u2014"}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-right whitespace-nowrap">
                        {item.daysUntilExpiry !== undefined
                          ? getDaysLabel(item.daysUntilExpiry)
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        {item.daysUntilExpiry !== undefined
                          ? getStatusBadge(item.daysUntilExpiry)
                          : <Badge variant="outline">N/A</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm bg-slate-50 rounded-lg border border-dashed border-gray-200">
              All evidence is up to date
            </div>
          )}
        </div>

        {/* Summary footer */}
        <div className="flex justify-between items-center pt-1 text-xs text-gray-400 border-t border-slate-100">
          <span>{stats.total} total evidence items</span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            {stats.expired + stats.expiring30 > 0
              ? `${stats.expired + stats.expiring30} need attention`
              : "All clear"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
