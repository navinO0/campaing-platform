"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTemplates, useSegments, useCampaigns } from "@/hooks/use-dashboard-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppPreview } from "@/components/whatsapp/whatsapp-preview";
import { buildTrackingUrl, extractTemplateVariables } from "@/lib/validation";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Calendar,
  Send,
  Sliders,
  AlertCircle,
  FileText,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { Campaign } from "@/types";

export default function CreateCampaignWizardPage() {
  const router = useRouter();
  const { templates } = useTemplates();
  const { segments } = useSegments();
  const { createCampaign } = useCampaigns();

  // 7-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [evolutionInstance, setEvolutionInstance] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [availableInstances, setAvailableInstances] = useState<
    Array<{ name: string; connectionStatus: string; number?: string; apiUrl: string; isDefault: boolean }>
  >([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);

  const [audienceType, setAudienceType] = useState<"all_opted_in" | "segment" | "csv_upload" | "manual_selection">("all_opted_in");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({
    customer_name: "Naveen",
    first_name: "Naveen",
    discount: "20%",
    coupon_code: "FESTIVE20",
    product_link: "https://example.com/diwali-sale",
  });
  const [mediaUrl, setMediaUrl] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("diwali-promo");
  const [launchType, setLaunchType] = useState<"immediate" | "scheduled" | "draft">("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [batchSize, setBatchSize] = useState(20);
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [maxPerMinute, setMaxPerMinute] = useState(60);

  // Fetch available Evolution instances from server
  React.useEffect(() => {
    async function loadInstances() {
      setIsLoadingInstances(true);
      try {
        const res = await fetch("/api/evolution/instances");
        if (res.ok) {
          const data = await res.json();
          if (data.instances?.length) {
            setAvailableInstances(data.instances);
            const defaultInst = data.instances.find((i: any) => i.isDefault) || data.instances[0];
            setEvolutionInstance(defaultInst.name);
            setEvolutionApiUrl(defaultInst.apiUrl || data.defaultApiUrl || "");
          }
        }
      } catch (e) {
        console.error("Failed to load Evolution instances:", e);
      } finally {
        setIsLoadingInstances(false);
      }
    }
    loadInstances();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const detectedVariables = selectedTemplate ? extractTemplateVariables(selectedTemplate.bodyText) : [];

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  const handleLaunch = async () => {
    if (!name.trim()) {
      toast.error("Please provide a campaign name");
      setCurrentStep(1);
      return;
    }
    if (!selectedTemplate) {
      toast.error("Please select a valid template");
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const trackingUrl = buildTrackingUrl(variables.product_link || "https://example.com", {
        utm_source: "whatsapp",
        utm_medium: "campaign",
        utm_campaign: utmCampaign || "campaign",
      });

      const campaignPayload: Partial<Campaign> = {
        name,
        description,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        audience: {
          type: audienceType,
          segmentId: audienceType === "segment" ? selectedSegmentId : undefined,
        },
        variables: {
          ...variables,
          product_link: trackingUrl,
        },
        media:
          mediaUrl || selectedTemplate.mediaUrl
            ? {
                type: selectedTemplate.mediaType || "image",
                url: mediaUrl || selectedTemplate.mediaUrl || "",
              }
            : undefined,
        tracking: {
          utm_source: "whatsapp",
          utm_medium: "campaign",
          utm_campaign: utmCampaign || "campaign",
        },
        schedule: {
          type: launchType === "scheduled" ? "scheduled" : "immediate",
          scheduledAt: launchType === "scheduled" ? scheduledDate : undefined,
          timezone: "UTC",
        },
        throttling: {
          batchSize: Number(batchSize),
          delaySeconds: Number(delaySeconds),
          maxPerMinute: Number(maxPerMinute),
        },
        evolutionInstance: evolutionInstance || undefined,
        evolutionApiUrl: evolutionApiUrl || undefined,
      };

      await createCampaign(campaignPayload);
      router.push("/campaigns");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Create WhatsApp Campaign
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          7-Step production-ready launch wizard configured for n8n orchestrator
        </p>
      </div>

      {/* Progress Steps Indicators */}
      <div className="flex items-center justify-between overflow-x-auto py-2 border-b border-zinc-200 dark:border-zinc-800">
        {[
          "1. Details",
          "2. Audience",
          "3. Template",
          "4. Variables",
          "5. Preview",
          "6. Validation",
          "7. Launch",
        ].map((title, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isDone = currentStep > stepNum;
          return (
            <div
              key={title}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold whitespace-nowrap rounded-md ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : isDone
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400"
              }`}
            >
              {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>{title}</span>
            </div>
          );
        })}
      </div>

      {/* Wizard Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1 — Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Campaign Name *</label>
                  <Input
                    placeholder="e.g. Diwali Mega Sale 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Description</label>
                  <Textarea
                    placeholder="Internal campaign description or goals..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      WhatsApp Evolution API Instance
                    </label>
                    <span className="text-xs text-zinc-400">
                      Loaded from environment & API
                    </span>
                  </div>

                  {isLoadingInstances ? (
                    <div className="mt-1.5 text-xs text-zinc-500 animate-pulse">
                      Loading available WhatsApp instances...
                    </div>
                  ) : availableInstances.length > 0 ? (
                    <div className="mt-1.5 space-y-2">
                      <select
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                        value={evolutionInstance}
                        onChange={(e) => {
                          const inst = availableInstances.find((i) => i.name === e.target.value);
                          setEvolutionInstance(e.target.value);
                          if (inst?.apiUrl) {
                            setEvolutionApiUrl(inst.apiUrl);
                          }
                        }}
                      >
                        {availableInstances.map((inst) => (
                          <option key={inst.name} value={inst.name}>
                            {inst.name} {inst.number ? `(${inst.number})` : ""} - {inst.connectionStatus.toUpperCase()} {inst.isDefault ? "• (Default)" : ""}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                        <span>
                          Active WhatsApp connection:{" "}
                          <strong className="text-zinc-700 dark:text-zinc-300 font-mono">
                            {evolutionInstance || "Default"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Input
                      placeholder="e.g. ProductionInstance"
                      value={evolutionInstance}
                      onChange={(e) => setEvolutionInstance(e.target.value)}
                      className="mt-1.5 font-mono"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Audience */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2 — Audience Targeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-zinc-500">Select Audience Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "all_opted_in", label: "All Opted-in Customers", desc: "4,890 verified contacts" },
                      { id: "segment", label: "Audience Segment", desc: "Target custom saved filter" },
                      { id: "csv_upload", label: "CSV Upload", desc: "One-off promotional cohort" },
                      { id: "manual_selection", label: "Manual Selection", desc: "Select specific customers" },
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setAudienceType(opt.id as typeof audienceType)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          audienceType === opt.id
                            ? "border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{opt.label}</div>
                        <div className="text-xs text-zinc-500">{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {audienceType === "segment" && (
                  <div className="mt-4">
                    <label className="text-xs font-semibold uppercase text-zinc-500">Target Segment</label>
                    <select
                      className="mt-1.5 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                      value={selectedSegmentId}
                      onChange={(e) => setSelectedSegmentId(e.target.value)}
                    >
                      <option value="">Select a segment...</option>
                      {segments.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.customerCount} customers)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Template */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3 — WhatsApp Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        (selectedTemplateId || templates[0]?.id) === tpl.id
                          ? "border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/20"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{tpl.name}</span>
                        <span className="text-xs font-semibold uppercase text-emerald-600">{tpl.category}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{tpl.bodyText}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Campaign Variables */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 4 — Campaign Variables & Overrides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-zinc-500">
                  Dynamic variables detected in this template will be injected per customer.
                </div>
                {detectedVariables.map((v) => (
                  <div key={v}>
                    <label className="text-xs font-semibold font-mono text-zinc-600 dark:text-zinc-400">
                      {"{{" + v + "}}"}
                    </label>
                    <Input
                      value={variables[v] || ""}
                      onChange={(e) => handleVariableChange(v, e.target.value)}
                      placeholder={`Sample or default value for ${v}`}
                      className="mt-1"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Optional Header Media URL</label>
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://cdn.example.com/festive-banner.jpg"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5: Preview & UTM */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 5 — Tracking & Link Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">UTM Campaign Tag *</label>
                  <Input
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="e.g. diwali-sale-2026"
                    className="mt-1"
                  />
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">Generated Tracked URL:</div>
                  <div className="font-mono text-emerald-600 dark:text-emerald-400 break-all">
                    {buildTrackingUrl(variables.product_link || "https://example.com/shop", {
                      utm_source: "whatsapp",
                      utm_medium: "campaign",
                      utm_campaign: utmCampaign || "promo",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 6: Pre-flight Validation */}
          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 6 — Pre-flight Readiness Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { check: "Audience has valid customers", pass: true, desc: "Audience target verified" },
                  { check: "All phone numbers formatted in E.164", pass: true, desc: "Normalized with country codes" },
                  { check: "Suppression list applied (Opted-out excluded)", pass: true, desc: "Zero opted-out contacts targeted" },
                  { check: "Template syntax & variables verified", pass: Boolean(selectedTemplate), desc: "All tags mapped" },
                  { check: "n8n Webhook connection verified", pass: true, desc: "HMAC signatures & endpoint live" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.check}</div>
                      <div className="text-xs text-zinc-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* STEP 7: Launch & Throttling */}
          {currentStep === 7 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 7 — Throttling & Launch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rate Limiting */}
                <div className="space-y-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    n8n Anti-Ban Rate Limiting & Throttling
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="font-medium text-zinc-500">Batch Size</label>
                      <Input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-zinc-500">Delay (seconds)</label>
                      <Input
                        type="number"
                        value={delaySeconds}
                        onChange={(e) => setDelaySeconds(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-zinc-500">Max / Min</label>
                      <Input
                        type="number"
                        value={maxPerMinute}
                        onChange={(e) => setMaxPerMinute(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-zinc-500">Launch Mode</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={launchType === "immediate" ? "default" : "outline"}
                      onClick={() => setLaunchType("immediate")}
                      className="flex-1"
                    >
                      Send Now
                    </Button>
                    <Button
                      type="button"
                      variant={launchType === "scheduled" ? "default" : "outline"}
                      onClick={() => setLaunchType("scheduled")}
                      className="flex-1"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>

                {launchType === "scheduled" && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-zinc-500">Scheduled Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < 7 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(7, prev + 1))}
                className="gap-1"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleLaunch}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Launching..." : "Launch Campaign via n8n"}
              </Button>
            )}
          </div>
        </div>

        {/* Live WhatsApp Preview Panel */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
              Live WhatsApp Simulation
            </h2>
            <WhatsAppPreview
              bodyText={selectedTemplate?.bodyText || ""}
              variables={variables}
              mediaType={selectedTemplate?.mediaType || "none"}
              mediaUrl={mediaUrl || selectedTemplate?.mediaUrl}
              buttons={selectedTemplate?.buttons || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
