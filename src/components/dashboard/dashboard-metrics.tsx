import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Send,
  CheckCircle2,
  Eye,
  AlertTriangle,
  UserX,
  LucideIcon,
} from "lucide-react";
import type { DashboardStats } from "@/types";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  rate?: number;
}

function MetricCard({ title, value, subtitle, icon: Icon, color, rate }: MetricCardProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {formatNumber(value)}
          </div>
          {rate !== undefined && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {formatPercent(rate)}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardMetrics({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Customers"
        value={stats.totalCustomers}
        subtitle="Across all sources"
        icon={Users}
        color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
      />
      <MetricCard
        title="Opted-in Customers"
        value={stats.optedInCustomers}
        subtitle="Eligible for promotional blasts"
        icon={UserCheck}
        color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      />
      <MetricCard
        title="Messages Sent"
        value={stats.messagesSent}
        subtitle={`${stats.campaignsSent} total campaigns executed`}
        icon={Send}
        color="bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
      />
      <MetricCard
        title="Delivered"
        value={stats.delivered}
        rate={stats.deliveryRate}
        subtitle="Delivery success rate"
        icon={CheckCircle2}
        color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      />
      <MetricCard
        title="Read"
        value={stats.read}
        rate={stats.readRate}
        subtitle="WhatsApp blue ticks confirmed"
        icon={Eye}
        color="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400"
      />
      <MetricCard
        title="Failed"
        value={stats.failed}
        rate={stats.failureRate}
        subtitle="Unreachable or invalid format"
        icon={AlertTriangle}
        color="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
      />
      <MetricCard
        title="Opted Out"
        value={stats.optedOut}
        rate={stats.optOutRate}
        subtitle="Suppressed from all future sends"
        icon={UserX}
        color="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
      />
      <MetricCard
        title="Campaigns Sent"
        value={stats.campaignsSent}
        subtitle="Broadcast executions via n8n"
        icon={Send}
        color="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
      />
    </div>
  );
}
