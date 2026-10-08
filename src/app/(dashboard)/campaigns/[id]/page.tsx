"use client";

import React, { use, useState } from "react";
import { useCampaignStatus, useCampaignLogs } from "@/hooks/use-dashboard-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: statusData, isLoading, refetch } = useCampaignStatus(id);
  const [logFilter, setLogFilter] = useState<string | undefined>(undefined);
  const { data: logs = [] } = useCampaignLogs(id, logFilter);

  const [killModalOpen, setKillModalOpen] = useState(false);
  const [stopping, setStopping] = useState(false);

  const stats = statusData?.stats || {
    totalAudience: 5000,
    queued: 2400,
    sent: 2600,
    delivered: 2420,
    read: 1850,
    failed: 180,
    optedOut: 8,
  };

  const status = statusData?.status || "Running";
  const progressPercent = Math.round((stats.sent / (stats.totalAudience || 1)) * 100);

  const handleStopCampaign = async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/stop`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.warning("Emergency kill switch executed! n8n notified.");
        setKillModalOpen(false);
        refetch();
      } else {
        toast.error("Failed to stop campaign: " + json.error?.message);
      }
    } catch {
      toast.error("Network error while triggering kill switch");
    } finally {
      setStopping(false);
    }
  };

  const handleExportLogs = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Customer,Phone,Message,Status,Error,Timestamp"]
        .concat(
          logs.map(
            (l) =>
              `"${l.customerName}","${l.phone}","${l.message.replace(/"/g, '""')}","${l.status}","${
                l.error || ""
              }","${l.timestamp}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campaign_logs_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Logs exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Emergency Kill Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Campaign: {id}
            </h1>
            <CampaignStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Real-time batch progress & live webhook telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === "Running" && (
            <Button
              variant="destructive"
              className="gap-2 font-semibold shadow-md animate-bounce"
              onClick={() => setKillModalOpen(true)}
            >
              <ShieldAlert className="h-4 w-4" />
              STOP CAMPAIGN
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Progress Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Execution Progress: {progressPercent}%
            </span>
            <span className="text-xs text-zinc-500">
              {formatNumber(stats.sent)} of {formatNumber(stats.totalAudience)} sent
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={stats.sent} max={stats.totalAudience} className="h-3" />
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Audience</div>
          <div className="mt-2 text-xl font-bold">{formatNumber(stats.totalAudience)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Queued</div>
          <div className="mt-2 text-xl font-bold text-amber-600">{formatNumber(stats.queued)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Sent</div>
          <div className="mt-2 text-xl font-bold text-purple-600">{formatNumber(stats.sent)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Delivered</div>
          <div className="mt-2 text-xl font-bold text-emerald-600">{formatNumber(stats.delivered)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Read</div>
          <div className="mt-2 text-xl font-bold text-blue-600">{formatNumber(stats.read)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Failed</div>
          <div className="mt-2 text-xl font-bold text-red-600">{formatNumber(stats.failed)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-medium text-zinc-500 uppercase">Opted Out</div>
          <div className="mt-2 text-xl font-bold text-orange-600">{formatNumber(stats.optedOut)}</div>
        </Card>
      </div>

      {/* Execution Logs Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Delivery Logs</CardTitle>
            <p className="text-xs text-zinc-500">
              Audit trail of every message processed by n8n orchestrator
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportLogs} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Pills */}
          <div className="mb-4 flex flex-wrap gap-2">
            {[undefined, "sent", "delivered", "read", "failed", "opted_out"].map((st) => (
              <Button
                key={st || "all"}
                size="sm"
                variant={logFilter === st ? "default" : "outline"}
                onClick={() => setLogFilter(st)}
                className="capitalize text-xs"
              >
                {st || "All Logs"}
              </Button>
            ))}
          </div>

          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-6">
                      No logs matching this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-xs">{log.customerName}</TableCell>
                      <TableCell className="text-xs font-mono">{log.phone}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate text-zinc-600 dark:text-zinc-400">
                        {log.message}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "read"
                              ? "default"
                              : log.status === "delivered"
                              ? "success"
                              : log.status === "failed" || log.status === "opted_out"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-[10px]"
                        >
                          {log.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Kill Switch Confirmation Modal */}
      <Modal
        isOpen={killModalOpen}
        onClose={() => setKillModalOpen(false)}
        title="Stop campaign?"
        description="5,000 customers are currently in this campaign."
        footer={
          <>
            <Button variant="outline" onClick={() => setKillModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={stopping}
              onClick={handleStopCampaign}
              className="gap-1.5"
            >
              <ShieldAlert className="h-4 w-4" />
              {stopping ? "Stopping..." : "Stop Campaign"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          <p className="font-semibold text-red-600 dark:text-red-400">
            Already sent messages cannot be recalled.
          </p>
          <p>
            Triggering this action will immediately post a halt command to the n8n kill switch
            webhook, terminating the Split-In-Batches execution loop and draining pending queues.
          </p>
        </div>
      </Modal>
    </div>
  );
}
