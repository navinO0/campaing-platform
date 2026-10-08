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

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [bodyText, setBodyText] = useState(
    "Hello {{customer_name}},\n\nWe have an exclusive offer for you! Enjoy {{discount}} OFF today.\n\nShop our collection:\n{{product_link}}"
  );
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mediaUrl, setMediaUrl] = useState(
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80"
  );
  const [buttons, setButtons] = useState<TemplateButton[]>([
    {
      id: "btn_1",
      type: "visit_website",
      text: "Shop Now",
      url: "https://example.com",
    },
  ]);

  const detectedVariables = extractTemplateVariables(bodyText);

  const handleAddButton = (type: TemplateButton["type"]) => {
    if (buttons.length >= 3) {
      toast.error("Maximum 3 buttons supported by WhatsApp template specification");
      return;
    }
    const newBtn: TemplateButton = {
      id: `btn_${Date.now()}`,
      type,
      text: type === "visit_website" ? "Visit Store" : type === "call_phone" ? "Call Us" : "Get Offer",
      url: type === "visit_website" ? "https://example.com" : undefined,
      phoneNumber: type === "call_phone" ? "+919876543210" : undefined,
    };
    setButtons([...buttons, newBtn]);
  };

  const handleRemoveButton = (id: string) => {
    setButtons(buttons.filter((b) => b.id !== id));
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    await createTemplate({
      name,
      category,
      bodyText,
      mediaType,
      mediaUrl: mediaType !== "none" ? mediaUrl : undefined,
      buttons,
    });
    setCreateModalOpen(false);
  };

  const handleOpenEdit = (tpl: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(tpl);
    setName(tpl.name);
    setCategory(tpl.category);
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
        category,
        bodyText,
        mediaType,
        mediaUrl: mediaType !== "none" ? mediaUrl : undefined,
        buttons,
      },
    });
    setEditModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      await deleteTemplate(id);
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(templates[0]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            WhatsApp Template Manager
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create, edit, delete, and sync WhatsApp marketing templates with Evolution API & Meta guidelines.
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
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid & Preview split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`cursor-pointer transition-all ${
                (selectedTemplate?.id || templates[0]?.id) === tpl.id
                  ? "border-emerald-600 ring-1 ring-emerald-600/30 dark:border-emerald-500"
                  : "hover:border-zinc-300"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <Badge variant={tpl.status === "Approved" ? "success" : "secondary"}>
                      {tpl.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleOpenEdit(tpl, e)}
                      title="Edit Template"
                      className="h-7 w-7"
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
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap line-clamp-3">
                  {tpl.bodyText}
                </p>

                {tpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tpl.variables.map((v) => (
                      <span
                        key={v}
                        className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {"{{" + v + "}}"}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
              Template Preview
            </h2>
            <WhatsAppPreview
              bodyText={selectedTemplate?.bodyText || bodyText}
              mediaType={selectedTemplate?.mediaType || mediaType}
              mediaUrl={selectedTemplate?.mediaUrl || mediaUrl}
              buttons={selectedTemplate?.buttons || buttons}
              variables={{
                customer_name: "Naveen",
                discount: "25%",
                product_link: "https://example.com/diwali-deal",
              }}
            />
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New WhatsApp Template"
        description="Configure text body, dynamic variable placeholders, media attachments, and CTA buttons."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Save Template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Template Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. festive_season_promo_01"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              <option value="MARKETING">Marketing (Promotional blasts)</option>
              <option value="UTILITY">Utility (Order updates, reminders)</option>
              <option value="AUTHENTICATION">Authentication (OTPs)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Message Body *</label>
            <Textarea
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Type message text using {{variable_name}} placeholders..."
              className="mt-1 font-mono text-xs"
            />
            {detectedVariables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
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
            <label className="text-xs font-semibold uppercase text-zinc-500">Header Media</label>
            <div className="mt-1 flex gap-2">
              <select
                className="w-32 rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-zinc-800"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="none">None</option>
              </select>
              {mediaType !== "none" && (
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
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
            <Button onClick={handleSaveEdit}>Update Template</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Template Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Message Body *</label>
            <Textarea
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="mt-1 font-mono text-xs"
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
