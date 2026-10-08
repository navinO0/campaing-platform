"use client";

import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { Eye, Play, Square, ExternalLink } from "lucide-react";
import type { Campaign } from "@/types";

interface RecentCampaignsTableProps {
  campaigns: Campaign[];
  onStartCampaign?: (id: string) => void;
  onStopCampaign?: (id: string) => void;
}

export function RecentCampaignsTable({
  campaigns,
  onStartCampaign,
  onStopCampaign,
}: RecentCampaignsTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No campaigns found.</p>
        <Link href="/campaigns/create" className="mt-4">
          <Button size="sm">Create your first campaign</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">Read</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                <Link
                  href={`/campaigns/${c.id}`}
                  className="hover:underline text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  {c.name}
                </Link>
                {c.description && (
                  <div className="text-xs text-zinc-400 line-clamp-1">{c.description}</div>
                )}
              </TableCell>
              <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                {c.templateName || c.templateId}
              </TableCell>
              <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                {c.audience.type.replace("_", " ")} ({formatNumber(c.stats.totalAudience)})
              </TableCell>
              <TableCell className="text-right font-medium">{formatNumber(c.stats.sent)}</TableCell>
              <TableCell className="text-right text-emerald-600 font-medium">
                {formatNumber(c.stats.delivered)}
              </TableCell>
              <TableCell className="text-right text-blue-600 font-medium">
                {formatNumber(c.stats.read)}
              </TableCell>
              <TableCell className="text-right text-red-600 font-medium">
                {formatNumber(c.stats.failed)}
              </TableCell>
              <TableCell>
                <CampaignStatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                {formatDate(c.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/campaigns/${c.id}`}>
                    <Button variant="ghost" size="icon" title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>

                  {c.status === "Draft" && onStartCampaign && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onStartCampaign(c.id)}
                      className="text-emerald-600 hover:text-emerald-700"
                      title="Launch via n8n"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}

                  {c.status === "Running" && onStopCampaign && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onStopCampaign(c.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Stop Campaign"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
