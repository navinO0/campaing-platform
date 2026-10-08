"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Campaign, Template, Customer, CustomerSegment, CampaignLog, ApiResponse } from "@/types";
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

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Campaign> = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to update campaign");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign updated successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update campaign");
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete campaign");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete campaign");
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
    updateCampaign: updateCampaignMutation.mutateAsync,
    deleteCampaign: deleteCampaignMutation.mutateAsync,
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
    onSuccess: () => {
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

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Template> }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to update template");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated successfully!");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete template");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted successfully!");
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    syncTemplates: syncTemplatesMutation.mutateAsync,
    isSyncing: syncTemplatesMutation.isPending,
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
  };
}

export function useCustomers(filterParams?: {
  search?: string;
  segment?: string;
  optedIn?: boolean;
  country?: string;
  tag?: string;
}) {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ["customers", filterParams],
    queryFn: async (): Promise<Customer[]> => {
      const searchParams = new URLSearchParams();
      if (filterParams?.search) searchParams.set("search", filterParams.search);
      if (filterParams?.segment) searchParams.set("segment", filterParams.segment);
      if (filterParams?.optedIn !== undefined) searchParams.set("optedIn", String(filterParams.optedIn));
      if (filterParams?.country) searchParams.set("country", filterParams.country);
      if (filterParams?.tag) searchParams.set("tag", filterParams.tag);

      const res = await fetch(`/api/customers?${searchParams.toString()}`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to load customers");
      return json.data;
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: Partial<Customer>) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to create customer");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added successfully!");
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to update customer");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated successfully!");
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete customer");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer removed successfully!");
    },
  });

  const bulkTagMutation = useMutation({
    mutationFn: async ({ customerIds, tag }: { customerIds: string[]; tag: string }) => {
      const res = await fetch("/api/customers/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds, tag }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to bulk tag");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Bulk tags applied!");
    },
  });

  const bulkOptOutMutation = useMutation({
    mutationFn: async ({ customerIds, reason }: { customerIds: string[]; reason?: string }) => {
      const res = await fetch("/api/customers/bulk-opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to bulk opt out");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.warning("Selected customers added to opt-out blocklist!");
    },
  });

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    refetch: customersQuery.refetch,
    createCustomer: createCustomerMutation.mutateAsync,
    updateCustomer: updateCustomerMutation.mutateAsync,
    deleteCustomer: deleteCustomerMutation.mutateAsync,
    bulkTag: bulkTagMutation.mutateAsync,
    bulkOptOut: bulkOptOutMutation.mutateAsync,
  };
}

export function useSegments() {
  const queryClient = useQueryClient();

  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: async (): Promise<CustomerSegment[]> => {
      const res = await fetch("/api/segments");
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || "Failed to load segments");
      return json.data;
    },
  });

  const createSegmentMutation = useMutation({
    mutationFn: async (payload: Partial<CustomerSegment>) => {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to create segment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segment definition created!");
    },
  });

  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerSegment> }) => {
      const res = await fetch(`/api/segments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to update segment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segment updated successfully!");
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete segment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segment removed!");
    },
  });

  return {
    segments: segmentsQuery.data || [],
    isLoading: segmentsQuery.isLoading,
    refetch: segmentsQuery.refetch,
    createSegment: createSegmentMutation.mutateAsync,
    updateSegment: updateSegmentMutation.mutateAsync,
    deleteSegment: deleteSegmentMutation.mutateAsync,
  };
}
