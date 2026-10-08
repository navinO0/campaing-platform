"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Campaign, Template, Customer, CustomerSegment, CampaignLog, DashboardStats, ApiResponse } from "@/types";
import { toast } from "sonner";

export function useCampaigns() {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: async (): Promise<Campaign[]> => {
      const res = await fetch("/api/campaigns");
      const json: ApiResponse<Campaign[]> = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to load campaigns");
      return json.data;
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (payload: Partial<Campaign>) => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: ApiResponse<Campaign> = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to create campaign");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create campaign");
    },
  });

  const startCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: "POST" });
      const json: ApiResponse<Campaign> = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to start campaign");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign launched via n8n orchestrator!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start campaign");
    },
  });

  const stopCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/stop`, { method: "POST" });
      const json: ApiResponse<Campaign> = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to stop campaign");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.warning("Campaign emergency kill switch triggered!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to stop campaign");
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    isError: campaignsQuery.isError,
    error: campaignsQuery.error,
    createCampaign: createCampaignMutation.mutateAsync,
    startCampaign: startCampaignMutation.mutateAsync,
    stopCampaign: stopCampaignMutation.mutateAsync,
  };
}

export function useCampaignStatus(campaignId: string, pollIntervalMs = 5000) {
  return useQuery({
    queryKey: ["campaign-status", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/status`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to fetch status");
      return json.data as { campaignId: string; status: Campaign["status"]; stats: Campaign["stats"] };
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Only keep polling if the campaign is running
      return status === "Running" ? pollIntervalMs : false;
    },
  });
}

export function useCampaignLogs(campaignId: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["campaign-logs", campaignId, statusFilter],
    queryFn: async (): Promise<CampaignLog[]> => {
      const url = statusFilter
        ? `/api/campaigns/${campaignId}/logs?status=${statusFilter}`
        : `/api/campaigns/${campaignId}/logs`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to fetch logs");
      return json.data;
    },
    refetchInterval: 10000,
  });
}

export function useTemplates() {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: async (): Promise<Template[]> => {
      const res = await fetch("/api/templates");
      const json: ApiResponse<Template[]> = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to load templates");
      return json.data;
    },
  });

  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/templates/sync", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to sync templates");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Templates synchronized from WhatsApp provider!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to sync templates");
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: Partial<Template>) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: ApiResponse<Template> = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to create template");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template saved successfully!");
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    syncTemplates: syncTemplatesMutation.mutateAsync,
    isSyncing: syncTemplatesMutation.isPending,
    createTemplate: createTemplateMutation.mutateAsync,
  };
}

export function useCustomers(filterParams?: { search?: string; segment?: string; optedIn?: boolean }) {
  return useQuery({
    queryKey: ["customers", filterParams],
    queryFn: async (): Promise<Customer[]> => {
      const searchParams = new URLSearchParams();
      if (filterParams?.search) searchParams.set("search", filterParams.search);
      if (filterParams?.segment) searchParams.set("segment", filterParams.segment);
      if (filterParams?.optedIn !== undefined) searchParams.set("optedIn", String(filterParams.optedIn));

      const res = await fetch(`/api/customers?${searchParams.toString()}`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to load customers");
      return json.data;
    },
  });
}

export function useSegments() {
  const query = useQuery({
    queryKey: ["segments"],
    queryFn: async (): Promise<CustomerSegment[]> => {
      const res = await fetch("/api/segments");
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to load segments");
      return json.data;
    },
  });

  return {
    segments: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
