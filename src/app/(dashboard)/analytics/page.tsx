"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { initialStats } from "@/lib/data/store";
import { useDashboardStats } from "@/hooks/use-dashboard-data";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle,
  Eye,
  AlertTriangle,
  UserX,
  MousePointerClick,
} from "lucide-react";

export default function AnalyticsPage() {
  const { data: statsData } = useDashboardStats();
  const stats = statsData || initialStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Campaign Performance & Telemetry
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Delivery benchmarks, engagement funnels, and real verified conversion telemetry.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-zinc-500">Delivery Rate</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatPercent(stats.deliveryRate)}</div>
          <p className="text-xs text-zinc-400 mt-1">{formatNumber(stats.delivered)} messages confirmed delivered</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-zinc-500">Read Rate</span>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatPercent(stats.readRate)}</div>
          <p className="text-xs text-zinc-400 mt-1">{formatNumber(stats.read)} WhatsApp blue ticks</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-zinc-500">Failure Rate</span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatPercent(stats.failureRate)}</div>
          <p className="text-xs text-zinc-400 mt-1">{formatNumber(stats.failed)} unreachable contacts</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-zinc-500">Opt-Out Rate</span>
            <UserX className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatPercent(stats.optOutRate)}</div>
          <p className="text-xs text-zinc-400 mt-1">{formatNumber(stats.optedOut)} opted-out contacts</p>
        </Card>
      </div>

      {/* Engagement Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Funnel Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Audience Queued ({formatNumber(stats.messagesSent)})</span>
              <span>100%</span>
            </div>
            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Delivered ({formatNumber(stats.delivered)})</span>
              <span>{formatPercent(stats.deliveryRate)}</span>
            </div>
            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${stats.deliveryRate * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Read Blue Ticks ({formatNumber(stats.read)})</span>
              <span>{formatPercent(stats.readRate)}</span>
            </div>
            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${stats.readRate * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Click / Conversion Analytics (Strict Non-fabrication rule compliant) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <MousePointerClick className="h-4 w-4 text-emerald-600" />
            Click-Through Rate (CTR)
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Not available</span>
            <p className="text-xs text-zinc-400 mt-1">
              Link click tracking requires an active n8n redirect tracker node or Meta link tracking webhook.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Downstream Sales Conversion
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Not available</span>
            <p className="text-xs text-zinc-400 mt-1">
              Connect Google Analytics 4 or Shopify webhooks to n8n to ingest attribution data.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
