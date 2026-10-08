import React from "react";
import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/types";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  switch (status) {
    case "Running":
      return (
        <Badge variant="success" className="gap-1 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Running
        </Badge>
      );
    case "Completed":
      return <Badge variant="success">Completed</Badge>;
    case "Scheduled":
      return <Badge variant="warning">Scheduled</Badge>;
    case "Paused":
      return <Badge variant="secondary">Paused</Badge>;
    case "Failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "Cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "Draft":
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}
