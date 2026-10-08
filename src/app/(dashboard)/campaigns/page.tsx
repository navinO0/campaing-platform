"use client";

import React, { useState } from "react";
import { useCampaigns } from "@/hooks/use-dashboard-data";
import { RecentCampaignsTable } from "@/components/dashboard/recent-campaigns-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import { PlusCircle, Search, ShieldAlert } from "lucide-react";

export default function CampaignsListPage() {
  const { campaigns, startCampaign, stopCampaign } = useCampaigns();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [stopConfirmId, setStopConfirmId] = useState<string | null>(null);

  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.templateName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStopConfirmed = async () => {
    if (!stopConfirmId) return;
    await stopCampaign(stopConfirmId);
    setStopConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            All Campaigns
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Monitor, launch, schedule, or abort your WhatsApp promotional blasts.
          </p>
        </div>
        <Link href="/campaigns/create">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search campaigns by name..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["all", "Running", "Completed", "Draft", "Scheduled"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={selectedStatus === st ? "default" : "outline"}
              onClick={() => setSelectedStatus(st)}
              className="capitalize"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      <RecentCampaignsTable
        campaigns={filtered}
        onStartCampaign={(id) => startCampaign(id)}
        onStopCampaign={(id) => setStopConfirmId(id)}
      />

      {/* Kill Switch Modal */}
      <Modal
        isOpen={Boolean(stopConfirmId)}
        onClose={() => setStopConfirmId(null)}
        title="Stop Campaign Execution?"
        description="Trigger emergency webhook to n8n to interrupt active loop."
        footer={
          <>
            <Button variant="outline" onClick={() => setStopConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleStopConfirmed} className="gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Stop Campaign Now
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This operation will issue a command to n8n to halt delivery. Already dispatched WhatsApp
          messages cannot be unsent.
        </p>
      </Modal>
    </div>
  );
}
