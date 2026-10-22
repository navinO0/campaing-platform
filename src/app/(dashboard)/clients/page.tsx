"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { WhatsAppPreview } from "@/components/whatsapp/whatsapp-preview";
import {
  UserCheck,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  History,
  FileText,
  Phone,
  Building2,
  Calendar,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import type { Client, ClientTemplate, ClientReminder, MediaType, TemplateButton } from "@/types";
import { toast } from "sonner";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Modals state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [targetClientForTemplate, setTargetClientForTemplate] = useState<Client | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ClientTemplate | null>(null);

  const [sendReminderModalOpen, setSendReminderModalOpen] = useState(false);
  const [reminderClient, setReminderClient] = useState<Client | null>(null);
  const [selectedClientTemplate, setSelectedClientTemplate] = useState<ClientTemplate | null>(null);
  const [customReminderMessage, setCustomReminderMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [reminderHistory, setReminderHistory] = useState<ClientReminder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Client Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientServiceType, setClientServiceType] = useState("General Service Maintenance");
  const [clientCharges, setClientCharges] = useState("1499");
  const [clientDueDate, setClientDueDate] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [clientStatus, setClientStatus] = useState<Client["status"]>("active");

  // Template Form state
  const [tplTitle, setTplTitle] = useState("");
  const [tplCategory, setTplCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [tplHeader, setTplHeader] = useState("🛠️ Scheduled Maintenance & Charges Due");
  const [tplBody, setTplBody] = useState("");
  const [tplFooter, setTplFooter] = useState("Support Helpline: +91 98765 43210");
  const [tplMediaType, setTplMediaType] = useState<MediaType>("none");
  const [tplMediaUrl, setTplMediaUrl] = useState("");
  const [tplButtons, setTplButtons] = useState<TemplateButton[]>([
    {
      id: "b1",
      type: "visit_website",
      text: "Pay Online",
      url: "https://pay.example.com",
    },
  ]);

  // Fetch clients with their custom templates
  const loadClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setClients(json.data);
        // Expand first client by default if none expanded
        if (json.data.length > 0 && Object.keys(expandedClients).length === 0) {
          setExpandedClients({ [json.data[0].id]: true });
        }
      } else {
        toast.error("Failed to load clients");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load clients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const toggleExpand = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // Open Add/Edit Client Modal
  const handleOpenClientModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientName(client.name);
      setClientPhone(client.phone);
      setClientCompany(client.company || "");
      setClientServiceType(client.serviceType);
      setClientCharges(String(client.chargesAmount));
      setClientDueDate(client.dueDate || "");
      setClientNotes(client.notes || "");
      setClientStatus(client.status);
    } else {
      setEditingClient(null);
      setClientName("");
      setClientPhone("+91");
      setClientCompany("");
      setClientServiceType("HVAC Maintenance & AC Servicing");
      setClientCharges("1499");
      setClientDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
      setClientNotes("");
      setClientStatus("pending_payment");
    }
    setClientModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error("Client Name and Mobile Phone Number are required");
      return;
    }

    try {
      const payload = {
        name: clientName,
        phone: clientPhone,
        company: clientCompany || undefined,
        serviceType: clientServiceType,
        chargesAmount: Number(clientCharges) || 0,
        dueDate: clientDueDate || null,
        notes: clientNotes || undefined,
        status: clientStatus,
      };

      const endpoint = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(editingClient ? "Client updated!" : "New client added successfully!");
        setClientModalOpen(false);
        loadClients();
      } else {
        toast.error(json.error?.message || "Failed to save client");
      }
    } catch (e: any) {
      toast.error(e.message || "Request failed");
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete client "${client.name}" (${client.phone})?`)) return;

    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Client deleted successfully");
        loadClients();
      } else {
        toast.error(json.error?.message || "Failed to delete client");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete client");
    }
  };

  // Open Create/Edit Custom Template Modal for a specific client
  const handleOpenTemplateModal = (client: Client, template?: ClientTemplate) => {
    setTargetClientForTemplate(client);
    if (template) {
      setEditingTemplate(template);
      setTplTitle(template.title);
      setTplCategory(template.category as any);
      setTplHeader(template.headerText || "");
      setTplBody(template.bodyText);
      setTplFooter(template.footerText || "");
      setTplMediaType(template.mediaType);
      setTplMediaUrl(template.mediaUrl || "");
      setTplButtons(template.buttons || []);
    } else {
      setEditingTemplate(null);
      setTplTitle(`Maintenance Reminder for ${client.name}`);
      setTplCategory("UTILITY");
      setTplHeader("🛠️ Scheduled Maintenance & Charges Due");
      setTplBody(
        `Dear {{client_name}},\n\nThis is a friendly reminder regarding the scheduled maintenance for your {{service_type}}.\n\n📋 *Account Details:*\n• Client: {{client_name}}\n• Mobile: {{client_phone}}\n• Service: {{service_type}}\n• Outstanding Charges: ₹{{charges_amount}}\n• Payment Due Date: {{due_date}}\n\n💳 *Pay securely online:*\n{{payment_link}}\n\n⚠️ *Note:* If you have already completed this payment, please disregard this notice with our sincere appreciation.\n\nFor queries or rescheduling, reply directly to this message.`
      );
      setTplFooter("Official Service Desk • Helpdesk: +91 98765 43210");
      setTplMediaType("none");
      setTplMediaUrl("");
      setTplButtons([
        {
          id: "b1",
          type: "visit_website",
          text: "Pay Online",
          url: "https://pay.example.com",
        },
      ]);
    }
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!targetClientForTemplate || !tplTitle.trim() || !tplBody.trim()) {
      toast.error("Template title and body are required");
      return;
    }

    try {
      const payload = {
        title: tplTitle,
        category: tplCategory,
        headerText: tplHeader || undefined,
        bodyText: tplBody,
        footerText: tplFooter || undefined,
        mediaType: tplMediaType,
        mediaUrl: tplMediaType !== "none" ? tplMediaUrl : undefined,
        buttons: tplButtons,
        variables: {
          client_name: targetClientForTemplate.name,
          company: targetClientForTemplate.company || "",
          client_phone: targetClientForTemplate.phone,
          service_type: targetClientForTemplate.serviceType,
          charges_amount: String(targetClientForTemplate.chargesAmount),
          due_date: targetClientForTemplate.dueDate || "",
          payment_link: "https://pay.example.com",
        },
      };

      const endpoint = editingTemplate
        ? `/api/clients/templates/${editingTemplate.id}`
        : `/api/clients/${targetClientForTemplate.id}/templates`;
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(editingTemplate ? "Custom template updated!" : "Custom template created for client!");
        setTemplateModalOpen(false);
        loadClients();
      } else {
        toast.error(json.error?.message || "Failed to save template");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this custom template?")) return;

    try {
      const res = await fetch(`/api/clients/templates/${templateId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Custom template deleted");
        loadClients();
      } else {
        toast.error(json.error?.message || "Failed to delete");
      }
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  // Open Send Reminder Confirmation Modal
  const handleOpenSendReminder = (client: Client, template?: ClientTemplate) => {
    setReminderClient(client);
    const chosenTpl = template || client.customTemplates?.[0] || null;
    setSelectedClientTemplate(chosenTpl);

    if (chosenTpl) {
      // Interpolate default message with client's real data
      let rendered = chosenTpl.bodyText;
      const vars: Record<string, string> = {
        client_name: client.name,
        company: client.company || "",
        client_phone: client.phone,
        service_type: client.serviceType,
        charges_amount: String(client.chargesAmount),
        due_date: client.dueDate || "",
        payment_link: "https://pay.example.com",
        ...chosenTpl.variables,
      };
      Object.entries(vars).forEach(([k, v]) => {
        const reg = new RegExp(`\\{\\{${k}\\}\\}`, "g");
        rendered = rendered.replace(reg, v || "");
      });
      setCustomReminderMessage(rendered);
    } else {
      setCustomReminderMessage(
        `Dear ${client.name},\n\nThis is a gentle reminder regarding scheduled maintenance for ${client.serviceType}. Outstanding charges: ₹${client.chargesAmount}, due on ${client.dueDate || "N/A"}.\n\n⚠️ Note: If you have already paid this invoice, please ignore this message.\n\nThank you!`
      );
    }
    setSendReminderModalOpen(true);
  };

  const handleSendReminder = async () => {
    if (!reminderClient || !customReminderMessage.trim()) return;
    setIsSending(true);

    try {
      const payload = {
        clientId: reminderClient.id,
        clientTemplateId: selectedClientTemplate?.id || null,
        phone: reminderClient.phone,
        clientName: reminderClient.name,
        message: customReminderMessage,
        headerText: selectedClientTemplate?.headerText || undefined,
        footerText: selectedClientTemplate?.footerText || undefined,
        mediaUrl: selectedClientTemplate?.mediaUrl || undefined,
      };

      const res = await fetch("/api/clients/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`WhatsApp reminder sent to ${reminderClient.phone}!`);
        setSendReminderModalOpen(false);
        loadClients();
      } else {
        toast.error(json.error?.message || "Failed to dispatch reminder");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to dispatch reminder");
    } finally {
      setIsSending(false);
    }
  };

  // Open Reminder History Modal
  const handleOpenHistory = async (client: Client) => {
    setHistoryClient(client);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/reminders`);
      const json = await res.json();
      if (json.success) {
        setReminderHistory(json.data || []);
      }
    } catch (e) {
      toast.error("Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      c.serviceType.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate high-level stats
  const totalClientsCount = clients.length;
  const totalTemplatesCount = clients.reduce((acc, c) => acc + (c.customTemplates?.length || 0), 0);
  const totalChargesDue = clients
    .filter((c) => c.status === "pending_payment" || c.status === "overdue")
    .reduce((acc, c) => acc + Number(c.chargesAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-emerald-600" />
            Clients & Custom Templates
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create custom templates tailored to a particular client / mobile number, track services and charges, and send direct WhatsApp reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadClients} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => handleOpenClientModal()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <PlusCircle className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Clients</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalClientsCount}</span>
            <span className="text-xs text-zinc-500">accounts registered</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Custom Templates</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totalTemplatesCount}</span>
            <span className="text-xs text-zinc-500">client-specific templates</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pending Charges Due</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">₹{totalChargesDue.toLocaleString()}</span>
            <span className="text-xs text-zinc-500">across clients</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Dispatch Channel</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp Live Direct
            </span>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500">Filter Status:</span>
          {["all", "active", "pending_payment", "overdue"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "ghost"}
              onClick={() => setStatusFilter(st)}
              className="text-xs h-7 capitalize"
            >
              {st.replace("_", " ")}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone (+91...), company..."
            className="h-8 pl-8 text-xs bg-white dark:bg-zinc-900"
          />
        </div>
      </div>

      {/* Clients Grouped List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <Card className="p-12 text-center text-zinc-500">
            <UserCheck className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-medium">No clients found matching your search.</p>
            <Button onClick={() => handleOpenClientModal()} variant="outline" size="sm" className="mt-3 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Add Your First Client
            </Button>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const isExpanded = expandedClients[client.id] ?? false;
            const customTpls = client.customTemplates || [];

            return (
              <Card key={client.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm transition-all">
                {/* Client Main Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-sm">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{client.name}</h3>
                        {client.company && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {client.company}
                          </span>
                        )}
                        <Badge
                          variant={
                            client.status === "active"
                              ? "success"
                              : client.status === "overdue"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {client.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="mt-1.5 flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          <Phone className="h-3.5 w-3.5" />
                          {client.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-zinc-500">Service:</span> {client.serviceType}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          <IndianRupee className="h-3 w-3" />
                          Charges: ₹{client.chargesAmount.toLocaleString()}
                        </span>
                        {client.dueDate && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="h-3 w-3" /> Due: {client.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this Client */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleOpenSendReminder(client)}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Reminder
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenTemplateModal(client)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Custom Template
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenHistory(client)}
                      title="View reminder dispatch history"
                      className="h-8 px-2 text-xs gap-1 text-zinc-600"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenClientModal(client)}
                      title="Edit client"
                      className="h-8 w-8 text-zinc-500"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteClient(client)}
                      title="Delete client"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpand(client.id)}
                      className="gap-1 text-xs h-8 px-2 text-zinc-500 font-medium"
                    >
                      {customTpls.length} Template(s)
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Collapsible Custom Templates Section grouped under this Client */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        Custom WhatsApp Templates for {client.name} ({client.phone})
                      </div>
                      <span className="text-xs text-zinc-400">
                        Tailored for this specific mobile number
                      </span>
                    </div>

                    {customTpls.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
                        <p className="text-xs text-zinc-500 mb-2">
                          No custom template created yet for {client.name}.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenTemplateModal(client)}
                          className="gap-1 text-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Create First Custom Template
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {customTpls.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                  {tpl.title}
                                </span>
                                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                                  {tpl.category}
                                </Badge>
                              </div>

                              {tpl.headerText && (
                                <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                  Header: <span className="font-normal italic">{tpl.headerText}</span>
                                </div>
                              )}

                              <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-3 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded border border-zinc-100 dark:border-zinc-800 font-sans">
                                {tpl.bodyText}
                              </p>

                              {tpl.footerText && (
                                <div className="text-[10px] text-zinc-400 italic">
                                  Footer: {tpl.footerText}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                              <span>Sent: {tpl.sentCount} time(s)</span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenSendReminder(client, tpl)}
                                  className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <Send className="h-3 w-3" />
                                  Send This
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenTemplateModal(client, tpl)}
                                  className="h-7 w-7 text-zinc-500"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteTemplate(tpl.id)}
                                  className="h-7 w-7 text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL 1: Add/Edit Client */}
      <Modal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        title={editingClient ? "Edit Client Account" : "Add New Client"}
        description="Register client details, service type, mobile number, and default charges."
        footer={
          <>
            <Button variant="outline" onClick={() => setClientModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {editingClient ? "Save Changes" : "Create Client"}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Client / Contact Name *</label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Mobile Phone Number (with Country Code) *</label>
            <Input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="e.g. +919876543210"
              className="mt-1 font-mono"
            />
            <span className="text-[11px] text-zinc-400">WhatsApp messages and reminders will be delivered to this number.</span>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Company / Branch Name (Optional)</label>
            <Input
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="e.g. Sharma Enterprises Ltd"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Service Maintenance Type *</label>
            <Input
              value={clientServiceType}
              onChange={(e) => setClientServiceType(e.target.value)}
              placeholder="e.g. HVAC Annual Servicing & Gas Top-up"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Charges Due (₹)</label>
              <Input
                type="number"
                value={clientCharges}
                onChange={(e) => setClientCharges(e.target.value)}
                placeholder="1499"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Payment Due Date</label>
              <Input
                type="date"
                value={clientDueDate}
                onChange={(e) => setClientDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Account Status</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              value={clientStatus}
              onChange={(e) => setClientStatus(e.target.value as any)}
            >
              <option value="pending_payment">Pending Payment (Reminder due)</option>
              <option value="active">Active (Account in good standing)</option>
              <option value="overdue">Overdue (Payment past due)</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Internal Notes</label>
            <Textarea
              rows={2}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="e.g. Client requested reminder sent on Friday afternoon."
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Create/Edit Custom Template for a specific Client */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={editingTemplate ? "Edit Custom Client Template" : `Create Custom Template for ${targetClientForTemplate?.name}`}
        description={`This template is specifically tied to ${targetClientForTemplate?.phone} and pre-populated with their account variables.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Sparkles className="h-4 w-4" />
              Save Custom Template
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Template Title *</label>
            <Input
              value={tplTitle}
              onChange={(e) => setTplTitle(e.target.value)}
              placeholder="e.g. AC Maintenance & Charges Reminder"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Header Text (Optional)</label>
            <Input
              value={tplHeader}
              onChange={(e) => setTplHeader(e.target.value)}
              placeholder="e.g. 🛠️ Scheduled Service Notice"
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-zinc-500">Message Body *</label>
              <span className="text-[11px] text-emerald-600 font-mono">
                {`{{client_name}}, {{service_type}}, {{charges_amount}}, {{due_date}}`}
              </span>
            </div>
            <Textarea
              rows={7}
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              className="mt-1 font-mono text-xs leading-relaxed"
            />
            <div className="mt-1.5 text-[11px] text-zinc-500">
              💡 Tip: Always include: <em>"Note: If you have already paid, please ignore this notice."</em>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Footer Text (Optional)</label>
            <Input
              value={tplFooter}
              onChange={(e) => setTplFooter(e.target.value)}
              placeholder="e.g. Support: +91 98765 43210"
              className="mt-1"
            />
          </div>

          {/* Quick Buttons Configuration */}
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Call-To-Action Button</label>
            <div className="mt-1 flex gap-2">
              <Input
                value={tplButtons[0]?.text || "Pay Charges"}
                onChange={(e) =>
                  setTplButtons([
                    {
                      id: "b1",
                      type: "visit_website",
                      text: e.target.value,
                      url: tplButtons[0]?.url || "https://pay.example.com",
                    },
                  ])
                }
                placeholder="Button Label (e.g. Pay Now)"
                className="text-xs flex-1"
              />
              <Input
                value={tplButtons[0]?.url || "https://pay.example.com"}
                onChange={(e) =>
                  setTplButtons([
                    {
                      id: "b1",
                      type: "visit_website",
                      text: tplButtons[0]?.text || "Pay Charges",
                      url: e.target.value,
                    },
                  ])
                }
                placeholder="Payment Link URL"
                className="text-xs flex-1"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Send Reminder with Real-time WhatsApp Preview */}
      <Modal
        isOpen={sendReminderModalOpen}
        onClose={() => setSendReminderModalOpen(false)}
        title={`Send WhatsApp Reminder to ${reminderClient?.name}`}
        description={`Destination number: ${reminderClient?.phone}. Verify the rendered message below before sending.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setSendReminderModalOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendReminder}
              disabled={isSending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className={`h-4 w-4 ${isSending ? "animate-spin" : ""}`} />
              {isSending ? "Sending via WhatsApp..." : "Send Reminder Now"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {reminderClient?.customTemplates && reminderClient.customTemplates.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Select Template to Dispatch</label>
              <select
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                value={selectedClientTemplate?.id || ""}
                onChange={(e) => {
                  const tpl = reminderClient.customTemplates?.find((t) => t.id === e.target.value);
                  if (tpl) {
                    setSelectedClientTemplate(tpl);
                    let rendered = tpl.bodyText;
                    const vars: Record<string, string> = {
                      client_name: reminderClient.name,
                      company: reminderClient.company || "",
                      client_phone: reminderClient.phone,
                      service_type: reminderClient.serviceType,
                      charges_amount: String(reminderClient.chargesAmount),
                      due_date: reminderClient.dueDate || "",
                      payment_link: "https://pay.example.com",
                      ...tpl.variables,
                    };
                    Object.entries(vars).forEach(([k, v]) => {
                      const reg = new RegExp(`\\{\\{${k}\\}\\}`, "g");
                      rendered = rendered.replace(reg, v || "");
                    });
                    setCustomReminderMessage(rendered);
                  }
                }}
              >
                {reminderClient.customTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Edit / Review Message Text</label>
            <Textarea
              rows={6}
              value={customReminderMessage}
              onChange={(e) => setCustomReminderMessage(e.target.value)}
              className="mt-1 font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Real-time WhatsApp Simulation Preview */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-semibold uppercase text-zinc-500 mb-2 text-center">
              Recipient WhatsApp Preview ({reminderClient?.phone})
            </div>
            <div className="max-w-md mx-auto scale-90 sm:scale-100 origin-top">
              <WhatsAppPreview
                headerText={selectedClientTemplate?.headerText}
                bodyText={customReminderMessage}
                footerText={selectedClientTemplate?.footerText}
                buttons={selectedClientTemplate?.buttons}
                senderName="Official Service Desk"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Reminder History Drawer/Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Reminder History — ${historyClient?.name}`}
        description={`Log of all WhatsApp reminders sent to ${historyClient?.phone}.`}
        footer={
          <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
              Loading reminder dispatch logs...
            </div>
          ) : reminderHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No previous reminders recorded for this client.
            </div>
          ) : (
            reminderHistory.map((rem) => (
              <div
                key={rem.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Sent via WhatsApp
                  </span>
                  <span className="text-zinc-400 font-mono text-[11px]">
                    {new Date(rem.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap font-sans bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                  {rem.renderedMessage}
                </p>
                {rem.evolutionMessageId && (
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Provider ID: {rem.evolutionMessageId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

