"use client";

import React, { useState } from "react";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { RecentCampaignsTable } from "@/components/dashboard/recent-campaigns-table";
import { initialStats } from "@/lib/data/store";
import { useCampaigns, useDashboardStats } from "@/hooks/use-dashboard-data";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import { PlusCircle, RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";

export default function DashboardPage() {
  const { campaigns, isLoading, isError, error, startCampaign, stopCampaign } = useCampaigns();
  const { data: statsData } = useDashboardStats();
  const [stopConfirmId, setStopConfirmId] = useState<string | null>(null);

  const handleStopConfirmed = async () => {
    if (!stopConfirmId) return;
    await stopCampaign(stopConfirmId);
    setStopConfirmId(null);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Promotional Campaign Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Enterprise WhatsApp campaign automation orchestrated via secure n8n webhooks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/campaigns/create">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Metrics Cards */}
      <DashboardMetrics stats={statsData || initialStats} />

      {/* Recent Campaigns Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Campaigns
            </h2>
            <p className="text-xs text-zinc-500">
              Real-time delivery progress & actions
            </p>
          </div>
          <Link
            href="/campaigns"
            className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            View all campaigns →
          </Link>
        </div>

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{(error as Error)?.message || "Failed to load campaigns"}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
            <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <RecentCampaignsTable
            campaigns={campaigns}
            onStartCampaign={(id) => startCampaign(id)}
            onStopCampaign={(id) => setStopConfirmId(id)}
          />
        )}
      </div>

      {/* Stop Campaign Emergency Modal */}
      <Modal
        isOpen={Boolean(stopConfirmId)}
        onClose={() => setStopConfirmId(null)}
        title="Stop WhatsApp Campaign?"
        description="Emergency kill switch will notify n8n to halt message dispatch immediately."
        footer={
          <>
            <Button variant="outline" onClick={() => setStopConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleStopConfirmed} className="gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Confirm Emergency Stop
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          <p>
            You are about to abort this campaign execution. Any remaining customer queues in n8n
            will be cancelled.
          </p>
          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <strong>Note:</strong> Messages already delivered by Evolution API to Meta/WhatsApp cannot be recalled.
          </div>
        </div>
      </Modal>
    </div>
  );
}
