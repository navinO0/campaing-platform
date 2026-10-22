"use client";

import React, { useState } from "react";
import { useTemplates } from "@/hooks/use-dashboard-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { WhatsAppPreview } from "@/components/whatsapp/whatsapp-preview";
import { extractTemplateVariables } from "@/lib/validation";
import {
  PlusCircle,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  Phone,
  Trash2,
  Edit2,
  Search,
  Wrench,
  PartyPopper,
  Layers,
} from "lucide-react";
import type { MediaType, TemplateButton, Template } from "@/types";
import { toast } from "sonner";

export default function TemplatesPage() {
  const {
    templates,
    syncTemplates,
    isSyncing,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();

  const [activeTab, setActiveTab] = useState<"ALL" | "UTILITY" | "MARKETING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("UTILITY");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [bodyText, setBodyText] = useState(
    "Dear {{customer_name}},\n\nThis is a friendly reminder regarding your scheduled maintenance for {{service_name}} on {{maintenance_date}}.\n\nTotal Charges: {{amount_due}}\n\nPay online: {{payment_link}}\n\nNote: Please ignore this notice if you have already completed payment."
  );
  const [mediaType, setMediaType] = useState<MediaType>("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [buttons, setButtons] = useState<TemplateButton[]>([
    {
      id: "btn_1",
      type: "visit_website",
      text: "Pay Online",
      url: "https://pay.example.com",
    },
  ]);

  const currentTemplate = selectedTemplate || templates[0];
  const detectedVariables = extractTemplateVariables(bodyText);

  // Filter templates by category and search term
  const filteredTemplates = templates.filter((tpl) => {
    const matchesTab = activeTab === "ALL" || tpl.category === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      tpl.name.toLowerCase().includes(q) ||
      (tpl.description && tpl.description.toLowerCase().includes(q)) ||
      tpl.bodyText.toLowerCase().includes(q) ||
      tpl.variables.some((v) => v.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const handleAddButton = (type: TemplateButton["type"]) => {
    if (buttons.length >= 3) {
      toast.error("Maximum 3 buttons supported by WhatsApp template specification");
      return;
    }
    const newBtn: TemplateButton = {
      id: `btn_${Date.now()}`,
      type,
      text: type === "visit_website" ? "Visit Portal" : type === "call_phone" ? "Call Helpline" : "Get Offer",
      url: type === "visit_website" ? "https://example.com" : undefined,
      phoneNumber: type === "call_phone" ? "+919876543210" : undefined,
    };
    setButtons([...buttons, newBtn]);
  };

  const handleRemoveButton = (id: string) => {
    setButtons(buttons.filter((b) => b.id !== id));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setHeaderText("");
    setFooterText("");
    setCategory("UTILITY");
    setBodyText(
      "Dear {{customer_name}},\n\nThis is a reminder regarding your scheduled maintenance for {{service_name}} on {{maintenance_date}}.\n\nTotal Charges: {{amount_due}}\n\nPay online: {{payment_link}}\n\nNote: Please ignore this notice if you have already completed payment."
    );
    setMediaType("none");
    setMediaUrl("");
    setButtons([
      {
        id: "btn_1",
        type: "visit_website",
        text: "Pay Online",
        url: "https://pay.example.com",
      },
    ]);
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    await createTemplate({
      name,
      description: description || undefined,
      category,
      headerText: headerText || undefined,
      bodyText,
      footerText: footerText || undefined,
      mediaType,
      mediaUrl: mediaType !== "none" ? mediaUrl : undefined,
      buttons,
    });
    setCreateModalOpen(false);
    resetForm();
  };

  const handleOpenEdit = (tpl: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(tpl);
    setName(tpl.name);
    setDescription(tpl.description || "");
    setCategory(tpl.category);
    setHeaderText(tpl.headerText || "");
    setFooterText(tpl.footerText || "");
    setBodyText(tpl.bodyText);
    setMediaType(tpl.mediaType);
    setMediaUrl(tpl.mediaUrl || "");
    setButtons(tpl.buttons || []);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !name.trim()) return;
    await updateTemplate({
      id: editingTemplate.id,
      data: {
        name,
        description: description || undefined,
        category,
        headerText: headerText || undefined,
        bodyText,
        footerText: footerText || undefined,
        mediaType,
        mediaUrl: mediaType !== "none" ? mediaUrl : undefined,
        buttons,
      },
    });
    setEditModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (id: string, tplName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete template "${tplName}"?`)) {
      await deleteTemplate(id);
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            WhatsApp Templates
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Official message templates for service maintenance notices, charges, customer greetings, and festive offers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncTemplates()}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Templates"}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button
            size="sm"
            variant={activeTab === "ALL" ? "default" : "ghost"}
            onClick={() => setActiveTab("ALL")}
            className="gap-1.5 text-xs h-8"
          >
            <Layers className="h-3.5 w-3.5" />
            All ({templates.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "UTILITY" ? "default" : "ghost"}
            onClick={() => setActiveTab("UTILITY")}
            className="gap-1.5 text-xs h-8"
          >
            <Wrench className="h-3.5 w-3.5" />
            Utility & Maintenance ({templates.filter((t) => t.category === "UTILITY").length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "MARKETING" ? "default" : "ghost"}
            onClick={() => setActiveTab("MARKETING")}
            className="gap-1.5 text-xs h-8"
          >
            <PartyPopper className="h-3.5 w-3.5" />
            Marketing & Festive ({templates.filter((t) => t.category === "MARKETING").length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or variables..."
            className="h-8 pl-8 text-xs bg-white dark:bg-zinc-900"
          />
        </div>
      </div>

      {/* Templates Grid & Preview split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3.5">
          {filteredTemplates.length === 0 ? (
            <Card className="p-8 text-center text-zinc-500">
              <p className="text-sm">No templates found matching your criteria.</p>
            </Card>
          ) : (
            filteredTemplates.map((tpl) => (
              <Card
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`cursor-pointer transition-all ${
                  (currentTemplate?.id || templates[0]?.id) === tpl.id
                    ? "border-emerald-600 ring-2 ring-emerald-500/30 dark:border-emerald-500"
                    : "hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {tpl.name}
                        </CardTitle>
                        <Badge
                          variant={
                            tpl.category === "UTILITY"
                              ? "secondary"
                              : "default"
                          }
                          className="text-[10px] uppercase font-mono"
                        >
                          {tpl.category}
                        </Badge>
                        <Badge
                          variant={tpl.status === "Approved" ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {tpl.status}
                        </Badge>
                      </div>
                      {tpl.description && (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {tpl.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleOpenEdit(tpl, e)}
                        title="Edit Template"
                        className="h-7 w-7 text-zinc-500 hover:text-zinc-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteTemplate(tpl.id, tpl.name, e)}
                        title="Delete Template"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  {tpl.headerText && (
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Header: <span className="font-normal italic">{tpl.headerText}</span>
                    </div>
                  )}

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-3 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 font-sans">
                    {tpl.bodyText}
                  </p>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tpl.variables.map((v) => (
                          <span
                            key={v}
                            className="rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-mono"
                          >
                            {"{{" + v + "}}"}
                          </span>
                        ))}
                      </div>
                    )}
                    {tpl.buttons && tpl.buttons.length > 0 && (
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {tpl.buttons.length} CTA Button(s)
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
              Real-time WhatsApp Preview
            </h2>
            <WhatsAppPreview
              headerText={currentTemplate?.headerText}
              bodyText={currentTemplate?.bodyText || bodyText}
              footerText={currentTemplate?.footerText}
              mediaType={currentTemplate?.mediaType || mediaType}
              mediaUrl={currentTemplate?.mediaUrl || mediaUrl}
              buttons={currentTemplate?.buttons || buttons}
              variables={
                currentTemplate?.exampleValues || {
                  customer_name: "Aarav Sharma",
                  service_name: "Annual HVAC / AC Servicing",
                  maintenance_date: "28th Oct 2026",
                  invoice_number: "INV-2026-8912",
                  amount_due: "₹1,499.00",
                  due_date: "31st Oct 2026",
                  payment_link: "https://pay.example.com/inv/8912",
                  portal_link: "https://portal.example.com",
                  business_name: "Apex Service Solutions",
                  festival_name: "Diwali",
                  discount_percentage: "25%",
                  coupon_code: "FESTIVE25",
                  valid_until: "15th Nov 2026",
                  offer_link: "https://example.com/festive-deal",
                }
              }
            />
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New WhatsApp Template"
        description="Configure header, message body, dynamic placeholders, footer, and interactive CTA buttons."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Sparkles className="h-4 w-4" />
              Save Template
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Template Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. service_maintenance_reminder_01"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Description / Intended Purpose</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Sent to notify customers of upcoming maintenance and pending fees"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              <option value="UTILITY">Utility (Service maintenance, charges, receipts, reminders)</option>
              <option value="MARKETING">Marketing (Festival wishes, promotional offers, announcements)</option>
              <option value="AUTHENTICATION">Authentication (OTPs, verification)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Optional Header Text</label>
            <Input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="e.g. 🛠️ Scheduled Service & Maintenance"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Message Body *</label>
            <Textarea
              rows={6}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Type message text using {{variable_name}} placeholders..."
              className="mt-1 font-mono text-xs leading-relaxed"
            />
            {detectedVariables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-zinc-500">Detected Variables:</span>
                {detectedVariables.map((v) => (
                  <Badge key={v} variant="outline" className="text-[10px] font-mono">
                    {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Optional Footer Text</label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="e.g. Reply STOP to opt out • Support: +91 98765 43210"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Header Media Attachment</label>
            <div className="mt-1 flex gap-2">
              <select
                className="w-32 rounded-md border border-zinc-200 bg-white dark:bg-zinc-900 px-2 py-1 text-xs dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
              >
                <option value="none">None</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
              {mediaType !== "none" && (
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 text-xs"
                />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-zinc-500">
                Call-To-Action Buttons ({buttons.length}/3)
              </label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddButton("visit_website")}
                  className="h-7 text-xs gap-1"
                >
                  <LinkIcon className="h-3 w-3" />
                  + URL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddButton("call_phone")}
                  className="h-7 text-xs gap-1"
                >
                  <Phone className="h-3 w-3" />
                  + Call
                </Button>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {buttons.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800"
                >
                  <span className="text-xs font-semibold uppercase font-mono text-zinc-500 w-24 truncate">
                    {b.type.replace("_", " ")}
                  </span>
                  <Input
                    value={b.text}
                    onChange={(e) => {
                      const next = buttons.map((item) =>
                        item.id === b.id ? { ...item, text: e.target.value } : item
                      );
                      setButtons(next);
                    }}
                    placeholder="Button Text"
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveButton(b.id)}
                    className="h-8 w-8 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit WhatsApp Template"
        description="Modify message text, variables, media URL, or CTA buttons."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Update Template
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Template Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Header Text</label>
            <Input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Message Body *</label>
            <Textarea
              rows={6}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="mt-1 font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Footer Text</label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Header Media URL</label>
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
