"use client";

import React, { useState } from "react";
import { useSegments } from "@/hooks/use-dashboard-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Layers, PlusCircle, Users, Filter, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function SegmentsPage() {
  const { segments, refetch } = useSegments();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [minSpent, setMinSpent] = useState("");

  const handleCreateSegment = async () => {
    if (!name.trim()) {
      toast.error("Segment name is required");
      return;
    }

    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          filter: {
            optedIn: true,
            tags: tagFilter ? tagFilter.split(",").map((t) => t.trim()) : undefined,
            minSpent: minSpent ? Number(minSpent) : undefined,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Failed to create segment");
        return;
      }

      toast.success("Segment definition registered!");
      setModalOpen(false);
      setName("");
      setDescription("");
      setTagFilter("");
      setMinSpent("");
      refetch();
    } catch {
      toast.error("Failed to connect to segments API");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Customer Audience Segments
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Define reusable filter logic dispatched directly to n8n without transmitting large datasets.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Segment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.map((seg) => (
          <Card key={seg.id} className="hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{seg.name}</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{seg.customerCount}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 min-h-[32px]">
                {seg.description || "Custom targeted audience group."}
              </p>

              <div className="rounded-md bg-zinc-50 dark:bg-zinc-800 p-2.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 space-y-1">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Filter Definition</div>
                <div>optedIn: true</div>
                {seg.filter.tags && <div>tags: [{seg.filter.tags.join(", ")}]</div>}
                {seg.filter.minSpent && <div>minSpent: ₹{seg.filter.minSpent}</div>}
              </div>

              <div className="text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <span>Updated: {formatDate(seg.updatedAt)}</span>
                <Badge variant="outline" className="text-[10px]">
                  Server Executed
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Segment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Audience Segment"
        description="Filter definitions will be dispatched to n8n to resolve audiences dynamically."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSegment} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Save Segment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Segment Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VIP Saree Connoisseurs"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Target shoppers who recently viewed saree catalogs"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">
              Filter by Tags (Comma separated)
            </label>
            <Input
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="sarees, fashion, vip"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">
              Minimum Lifetime Spend (₹)
            </label>
            <Input
              type="number"
              value={minSpent}
              onChange={(e) => setMinSpent(e.target.value)}
              placeholder="10000"
              className="mt-1"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
