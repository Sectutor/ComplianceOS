/**
 * AI Audit Log Viewer — Shows all external AI calls made for a client.
 *
 * Displays:
 * - Timestamp of each call
 * - Feature that triggered the call
 * - Data scope used
 * - Provider called
 * - Whether it was a dry-run
 * - Success/failure status
 * - Payload summary
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Badge, Button,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  ScrollArea,
} from "@complianceos/ui";
import { RefreshCw, CheckCircle2, XCircle, FlaskConical, ArrowRight } from "lucide-react";

interface AiAuditLogViewerProps {
  clientId: number;
}

export default function AiAuditLogViewer({ clientId }: AiAuditLogViewerProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.aiFeatures.getAuditLog.useQuery({
    clientId,
    limit: pageSize,
    offset: page * pageSize,
  });

  const entries = data?.entries || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>External AI Audit Log</CardTitle>
            <CardDescription>
              Immutable record of every attempt to send data to external AI providers.
              Includes both actual calls and dry-run attempts.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No external AI calls recorded yet.</p>
            <p className="text-sm mt-1">
              When AI features are enabled and external AI is active, every call will be logged here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.featureId}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{entry.provider}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.dataScope === "full" ? "destructive" :
                          entry.dataScope === "anonymized" ? "default" :
                          "secondary"
                        }
                        className="text-xs"
                      >
                        {entry.dataScope}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.wasDryRun ? (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                          <FlaskConical className="h-3 w-3" />
                          Dry Run
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                          <ArrowRight className="h-3 w-3" />
                          Live
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.confidenceScore ? `${entry.confidenceScore}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Pagination */}
        {entries.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1}–{(page * pageSize) + entries.length}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={entries.length < pageSize}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
