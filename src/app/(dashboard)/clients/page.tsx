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
  QrCode,
  Image as ImageIcon,
  Clock,
  Repeat,
  ExternalLink,
  Plus,
  X,
  CreditCard,
  ShieldCheck,
  Info,
} from "lucide-react";
import type {
  Client,
  ClientTemplate,
  ClientReminder,
  MediaType,
  TemplateButton,
  PaymentConfig,
  ScheduleType,
  RecurrenceFrequency,
  RecurringScheduleConfig,
} from "@/types";
import { toast } from "sonner";

// Curated banner presets for quick one-click selection
const BANNER_PRESETS = [
  {
    name: "🛠️ Service Care",
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
    desc: "AC & HVAC Maintenance",
  },
  {
    name: "💳 Invoice Due",
    url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    desc: "Billing & Payment Notice",
  },
  {
    name: "💧 PureWater RO",
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80",
    desc: "Water Purifier Routine",
  },
  {
    name: "🚛 Fleet Care",
    url: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&auto=format&fit=crop&q=80",
    desc: "Fleet GPS & Telematics",
  },
  {
    name: "🎉 Festive Greetings",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80",
    desc: "Festival & Seasonal Wishes",
  },
];

// Presets for Interactive "Choose One" Quick Replies
const CHOICE_PRESETS = [
  {
    name: "Payment & Callback",
    options: ["✅ Paid Already", "💳 Pay Online Now", "📞 Request Callback"],
  },
  {
    name: "Service Appointment",
    options: ["📅 Confirm Slot", "🕒 Reschedule Slot", "💬 Talk to Support"],
  },
  {
    name: "Customer Feedback",
    options: ["⭐ Highly Satisfied", "👍 Satisfactory", "⚠️ Need Help"],
  },
];

const WEEKDAY_NAMES = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

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
  const [tplBannerUrl, setTplBannerUrl] = useState("");

  // Payment Link & Custom QR Code state
  const [tplPaymentEnabled, setTplPaymentEnabled] = useState(true);
  const [tplPaymentUpiId, setTplPaymentUpiId] = useState("sharma.ac@okhdfcbank");
  const [tplPaymentPayee, setTplPaymentPayee] = useState("Sharma Enterprises");
  const [tplPaymentAmount, setTplPaymentAmount] = useState("1499");
  const [tplPaymentLink, setTplPaymentLink] = useState("https://pay.example.com/inv/8912");
  const [tplQrCodeUrl, setTplQrCodeUrl] = useState("");

  // Action Buttons
  const [tplButtons, setTplButtons] = useState<TemplateButton[]>([
    {
      id: "b1",
      type: "visit_website",
      text: "💳 Pay ₹1,499 Now",
      url: "https://pay.example.com/inv/8912",
    },
    {
      id: "b2",
      type: "call_phone",
      text: "📞 Call Helpline",
      phoneNumber: "+919876543210",
    },
  ]);

  // "Choose One" Quick Reply Options
  const [tplChoiceOptions, setTplChoiceOptions] = useState<string[]>([
    "✅ Paid Already",
    "💳 Pay Online Now",
    "📞 Request Callback",
  ]);
  const [newChoiceInput, setNewChoiceInput] = useState("");

  // Reminder Scheduling State (One-Time & Repeated Schedules)
  const [scheduleType, setScheduleType] = useState<ScheduleType>("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>("weekly");
  const [recurrenceTime, setRecurrenceTime] = useState("10:00");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([1]); // Mondays default
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number>(1);
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(7);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(true);
  const [endCondition, setEndCondition] = useState<"never" | "by_date" | "after_occurrences">("never");
  const [endAfterOccurrences, setEndAfterOccurrences] = useState<number>(3);
  const [endDate, setEndDate] = useState("");

  // Helper to construct standard UPI QR URL
  const generateUpiQr = (upiId: string, payee: string, amount: string) => {
    const amt = parseFloat(amount) || 0;
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      payee
    )}&am=${amt.toFixed(2)}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;
  };

  // Fetch clients with their custom templates
  const loadClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setClients(json.data);
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
        dueDate: clientDueDate || undefined,
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
        toast.success(editingClient ? "Client updated!" : "New client registered!");
        setClientModalOpen(false);
        loadClients();
      } else {
        toast.error(json.error?.message || "Failed to save client");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save client");
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Delete client "${client.name}" (${client.phone})? This will delete all custom templates and reminders for this client.`)) {
      return;
    }

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
      setTplBannerUrl(template.bannerUrl || "");
      setTplPaymentEnabled(template.paymentConfig?.enabled ?? false);
      setTplPaymentUpiId(template.paymentConfig?.upiId || `${client.name.toLowerCase().replace(/\s+/g, "")}@okhdfcbank`);
      setTplPaymentPayee(template.paymentConfig?.payeeName || client.company || client.name);
      setTplPaymentAmount(String(template.paymentConfig?.amount || client.chargesAmount));
      setTplPaymentLink(template.paymentConfig?.paymentLink || "https://pay.example.com");
      setTplQrCodeUrl(
        template.qrCodeUrl ||
          generateUpiQr(
            template.paymentConfig?.upiId || "payee@upi",
            client.name,
            String(client.chargesAmount)
          )
      );
      setTplButtons(template.buttons || []);
      setTplChoiceOptions(template.choiceOptions || ["✅ Paid Already", "💳 Pay Online Now", "📞 Request Callback"]);
    } else {
      setEditingTemplate(null);
      setTplTitle(`Custom Maintenance Reminder for ${client.name}`);
      setTplCategory("UTILITY");
      setTplHeader("🛠️ Scheduled Maintenance & Charges Due");
      setTplBody(
        `Dear {{client_name}},\n\nThis is a personalized reminder from our service desk regarding the scheduled maintenance for your {{service_type}}.\n\n📋 *Account Details:*\n• Client: {{client_name}}\n• Mobile: {{client_phone}}\n• Service Asset: {{service_type}}\n• Outstanding Charges: ₹{{charges_amount}}\n• Payment Due Date: {{due_date}}\n\n💳 *Pay securely online or scan QR below:*\n{{payment_link}}\n\n⚠️ *Note:* If you have already completed this payment, please disregard this notice with our sincere appreciation.\n\nFor queries or rescheduling, reply directly or choose an option below.`
      );
      setTplFooter("Official Service Desk • Helpdesk: +91 98765 43210");
      setTplMediaType("image");
      const defaultBanner = BANNER_PRESETS[0].url;
      setTplBannerUrl(defaultBanner);
      setTplMediaUrl(defaultBanner);

      const upi = `${client.name.toLowerCase().replace(/\s+/g, "")}.ac@okhdfcbank`;
      const payee = client.company || client.name;
      const amount = String(client.chargesAmount || 1499);
      const payLink = `https://pay.example.com/inv/${client.id.slice(-4)}`;

      setTplPaymentEnabled(true);
      setTplPaymentUpiId(upi);
      setTplPaymentPayee(payee);
      setTplPaymentAmount(amount);
      setTplPaymentLink(payLink);
      setTplQrCodeUrl(generateUpiQr(upi, payee, amount));

      setTplButtons([
        {
          id: "b1",
          type: "visit_website",
          text: `💳 Pay ₹${amount} Now`,
          url: payLink,
        },
        {
          id: "b2",
          type: "call_phone",
          text: "📞 Call Helpline",
          phoneNumber: "+919876543210",
        },
      ]);
      setTplChoiceOptions(["✅ Paid Already", "💳 Pay Online Now", "📞 Request Callback"]);
    }
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!targetClientForTemplate || !tplTitle.trim() || !tplBody.trim()) {
      toast.error("Template title and body are required");
      return;
    }

    try {
      const dynamicQr = tplPaymentEnabled
        ? generateUpiQr(tplPaymentUpiId, tplPaymentPayee, tplPaymentAmount)
        : undefined;

      const payload = {
        title: tplTitle,
        category: tplCategory,
        headerText: tplHeader || undefined,
        bodyText: tplBody,
        footerText: tplFooter || undefined,
        mediaType: tplBannerUrl ? "image" : tplMediaType,
        mediaUrl: tplBannerUrl || tplMediaUrl || undefined,
        bannerUrl: tplBannerUrl || undefined,
        qrCodeUrl: tplPaymentEnabled ? (tplQrCodeUrl || dynamicQr) : undefined,
        paymentConfig: {
          enabled: tplPaymentEnabled,
          upiId: tplPaymentEnabled ? tplPaymentUpiId : undefined,
          payeeName: tplPaymentEnabled ? tplPaymentPayee : undefined,
          amount: tplPaymentEnabled ? parseFloat(tplPaymentAmount) || 0 : undefined,
          paymentLink: tplPaymentEnabled ? tplPaymentLink : undefined,
          qrCodeUrl: tplPaymentEnabled ? (tplQrCodeUrl || dynamicQr) : undefined,
        },
        choiceOptions: tplChoiceOptions,
        buttons: tplButtons,
        variables: {
          client_name: targetClientForTemplate.name,
          company: targetClientForTemplate.company || "",
          client_phone: targetClientForTemplate.phone,
          service_type: targetClientForTemplate.serviceType,
          charges_amount: String(targetClientForTemplate.chargesAmount),
          due_date: targetClientForTemplate.dueDate || "",
          payment_link: tplPaymentLink || "https://pay.example.com",
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
        toast.success(editingTemplate ? "Custom template updated!" : "Custom template created with banner & QR!");
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

  // Open Send Reminder Confirmation Modal with Schedule Options
  const handleOpenSendReminder = (client: Client, template?: ClientTemplate) => {
    setReminderClient(client);
    const chosenTpl = template || client.customTemplates?.[0] || null;
    setSelectedClientTemplate(chosenTpl);

    // Initialize schedule controls
    setScheduleType("immediate");
    const tomorrow10am = new Date(Date.now() + 86400000);
    tomorrow10am.setHours(10, 0, 0, 0);
    setScheduledAt(tomorrow10am.toISOString().slice(0, 16));
    setRecurrenceFreq("weekly");
    setRecurrenceTime("10:00");
    setRecurrenceDays([1]); // Mondays
    setRecurrenceDayOfMonth(1);
    setRecurrenceInterval(7);
    setBusinessHoursOnly(true);
    setEndCondition("never");

    if (chosenTpl) {
      let rendered = chosenTpl.bodyText;
      const vars: Record<string, string> = {
        client_name: client.name,
        company: client.company || "",
        client_phone: client.phone,
        service_type: client.serviceType,
        charges_amount: String(client.chargesAmount),
        due_date: client.dueDate || "",
        payment_link: chosenTpl.paymentConfig?.paymentLink || "https://pay.example.com",
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
      const recurringRule: RecurringScheduleConfig | undefined =
        scheduleType === "recurring"
          ? {
              frequency: recurrenceFreq,
              timeOfDay: recurrenceTime,
              timezone: "Asia/Kolkata",
              daysOfWeek: recurrenceFreq === "weekly" ? recurrenceDays : undefined,
              dayOfMonth: recurrenceFreq === "monthly" ? recurrenceDayOfMonth : undefined,
              interval: recurrenceFreq === "daily" ? recurrenceInterval : undefined,
              sendWithinBusinessHours: businessHoursOnly,
              endCondition,
              endAfterOccurrences: endCondition === "after_occurrences" ? endAfterOccurrences : undefined,
              endDate: endCondition === "by_date" ? endDate : undefined,
            }
          : undefined;

      const payload = {
        clientId: reminderClient.id,
        clientTemplateId: selectedClientTemplate?.id || null,
        phone: reminderClient.phone,
        clientName: reminderClient.name,
        message: customReminderMessage,
        headerText: selectedClientTemplate?.headerText || undefined,
        footerText: selectedClientTemplate?.footerText || undefined,
        bannerUrl: selectedClientTemplate?.bannerUrl || undefined,
        qrCodeUrl: selectedClientTemplate?.qrCodeUrl || undefined,
        paymentConfig: selectedClientTemplate?.paymentConfig || undefined,
        choiceOptions: selectedClientTemplate?.choiceOptions || undefined,
        buttons: selectedClientTemplate?.buttons || undefined,
        mediaUrl: selectedClientTemplate?.bannerUrl || selectedClientTemplate?.mediaUrl || undefined,
        scheduleType,
        scheduledAt: scheduleType === "scheduled" ? scheduledAt : undefined,
        recurringRule,
      };

      const res = await fetch("/api/clients/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        if (scheduleType === "immediate") {
          toast.success(`WhatsApp reminder sent to ${reminderClient.phone}!`);
        } else if (scheduleType === "scheduled") {
          toast.success(`Reminder scheduled for ${reminderClient.phone}!`);
        } else {
          toast.success(`Repeated schedule activated for ${reminderClient.name}!`);
        }
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
    } catch {
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Clients & Custom Templates
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-xs">
              Direct Phone Grouping
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Create custom WhatsApp templates for specific mobile numbers with banner images, direct payment links, QR codes, & repeated schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadClients}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenClientModal()}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            Add Client Account
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search clients by name, phone (+91...), company, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Payment Statuses</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="overdue">Overdue</option>
          <option value="active">Active (Paid / Healthy)</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading clients and custom templates...
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <UserCheck className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No Clients Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
              Add your first client to start creating personalized WhatsApp templates with banners, QR codes, and automated recurring reminders.
            </p>
            <Button onClick={() => handleOpenClientModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Add First Client
            </Button>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const isExpanded = !!expandedClients[client.id];
            const customTpls = client.customTemplates || [];

            return (
              <Card key={client.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-xs">
                {/* Client Main Summary Bar */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                        {client.name}
                      </h3>
                      {client.company && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          <Building2 className="h-3 w-3" />
                          {client.company}
                        </span>
                      )}
                      <Badge
                        variant={
                          client.status === "overdue"
                            ? "destructive"
                            : client.status === "pending_payment"
                            ? "default"
                            : "outline"
                        }
                        className="text-[10px] uppercase font-mono"
                      >
                        {client.status.replace("_", " ")}
                      </Badge>

                      {/* Reminder schedule status badge if configured */}
                      {client.reminderSchedule?.type === "recurring" && (
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] gap-1">
                          <Repeat className="h-3 w-3" />
                          Repeated: {client.reminderSchedule.recurring?.frequency} @ {client.reminderSchedule.recurring?.timeOfDay || "10:00"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
                      <span className="font-mono flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {client.serviceType}
                      </span>
                      <span>•</span>
                      <span className="flex items-center font-bold text-zinc-900 dark:text-zinc-100">
                        <IndianRupee className="h-3 w-3 inline" />
                        {client.chargesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      {client.dueDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            Due: {client.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions for this client */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleOpenSendReminder(client)}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Reminder
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenTemplateModal(client)}
                      className="gap-1 text-xs h-8 px-2.5"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                      New Template
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenHistory(client)}
                      className="gap-1 text-xs h-8 px-2 text-zinc-500"
                    >
                      <History className="h-3.5 w-3.5" />
                      Logs
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenClientModal(client)}
                      className="h-8 w-8 text-zinc-500"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteClient(client)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
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
                        Tailored specifically for this phone number
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
                            <div className="space-y-2">
                              {/* Header & Category */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                  {tpl.title}
                                </span>
                                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                                  {tpl.category}
                                </Badge>
                              </div>

                              {/* Banner Thumbnail if available */}
                              {tpl.bannerUrl && (
                                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                  <img
                                    src={tpl.bannerUrl}
                                    alt="Template Banner"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <ImageIcon className="h-2.5 w-2.5 text-emerald-400" />
                                    Banner Image
                                  </div>
                                </div>
                              )}

                              {tpl.headerText && (
                                <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                  Header: <span className="font-normal italic">{tpl.headerText}</span>
                                </div>
                              )}

                              <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-3 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded border border-zinc-100 dark:border-zinc-800 font-sans">
                                {tpl.bodyText}
                              </p>

                              {/* Payment QR Badge & Details */}
                              {tpl.paymentConfig?.enabled && (
                                <div className="flex items-center gap-2 p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-[10px]">
                                  <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                    Instant UPI QR Pay: ₹{tpl.paymentConfig.amount || client.chargesAmount}
                                  </span>
                                  <span className="text-zinc-400 truncate">({tpl.paymentConfig.upiId})</span>
                                </div>
                              )}

                              {/* Interactive Choice Options (Choose One) Pills */}
                              {tpl.choiceOptions && tpl.choiceOptions.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                    Choose One Options:
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {tpl.choiceOptions.map((opt, i) => (
                                      <span
                                        key={i}
                                        className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 font-medium"
                                      >
                                        {opt}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons Link Preview */}
                              {tpl.buttons && tpl.buttons.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {tpl.buttons.map((b) => (
                                    <span
                                      key={b.id}
                                      className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 font-medium border border-emerald-500/20"
                                    >
                                      {b.type === "visit_website" && <ExternalLink className="h-2.5 w-2.5" />}
                                      {b.type === "call_phone" && <Phone className="h-2.5 w-2.5" />}
                                      {b.text}
                                    </span>
                                  ))}
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
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Client / Contact Person *</label>
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
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Business / Company Name (Optional)</label>
            <Input
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="e.g. Sharma Enterprises"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Service Maintenance Type *</label>
            <Input
              value={clientServiceType}
              onChange={(e) => setClientServiceType(e.target.value)}
              placeholder="e.g. HVAC & Industrial AC Servicing"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Charges Amount (INR ₹) *</label>
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

      {/* MODAL 2: Create/Edit Custom Template with Banner Images, QR Code, and Choice Options */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={editingTemplate ? "Edit Custom Client Template" : `Create Custom Template for ${targetClientForTemplate?.name}`}
        description={`Tailored for ${targetClientForTemplate?.phone} with Banner Image, Direct Payment Link, Dynamic QR Code, and 'Choose One' Quick Replies.`}
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
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Section 1: Basic Info */}
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Template Title *</label>
            <Input
              value={tplTitle}
              onChange={(e) => setTplTitle(e.target.value)}
              placeholder="e.g. Custom AC Maintenance & Charges Due"
              className="mt-1"
            />
          </div>

          {/* Section 2: Banner Image Selection */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                Banner Image Header (Top of Message)
              </label>
              {tplBannerUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTplBannerUrl("")}
                  className="h-6 text-[10px] text-red-500 px-1.5"
                >
                  Remove Banner
                </Button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {BANNER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTplBannerUrl(preset.url);
                    setTplMediaUrl(preset.url);
                    setTplMediaType("image");
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                    tplBannerUrl === preset.url
                      ? "bg-emerald-600 text-white font-medium border-emerald-600 shadow-xs"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <Input
              value={tplBannerUrl}
              onChange={(e) => {
                setTplBannerUrl(e.target.value);
                setTplMediaUrl(e.target.value);
                setTplMediaType(e.target.value ? "image" : "none");
              }}
              placeholder="Or enter custom image URL: https://example.com/banner.jpg"
              className="text-xs bg-white dark:bg-zinc-900"
            />

            {/* Live Banner Preview */}
            {tplBannerUrl && (
              <div className="relative w-full h-28 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <img src={tplBannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Section 3: Header Text */}
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Header Text (Bold title below banner)</label>
            <Input
              value={tplHeader}
              onChange={(e) => setTplHeader(e.target.value)}
              placeholder="e.g. 🛠️ Scheduled Service & Charges Notice"
              className="mt-1"
            />
          </div>

          {/* Section 4: Message Body Text */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-zinc-500">Message Body *</label>
              <span className="text-[10px] text-emerald-600 font-mono">
                {`{{client_name}}, {{service_type}}, {{charges_amount}}, {{due_date}}`}
              </span>
            </div>
            <Textarea
              rows={6}
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              className="mt-1 font-mono text-xs leading-relaxed"
            />
            <div className="mt-1 text-[11px] text-zinc-500">
              💡 Always include: <em>&ldquo;Note: If you have already paid this invoice, please ignore this notice.&rdquo;</em>
            </div>
          </div>

          {/* Section 5: Direct Payment Links & Custom QR Code */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                Direct Payment Links & Custom Payment QR
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-emerald-600">
                <input
                  type="checkbox"
                  checked={tplPaymentEnabled}
                  onChange={(e) => setTplPaymentEnabled(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                Enable Payment & QR
              </label>
            </div>

            {tplPaymentEnabled && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Recipient UPI ID</label>
                    <Input
                      value={tplPaymentUpiId}
                      onChange={(e) => {
                        setTplPaymentUpiId(e.target.value);
                        setTplQrCodeUrl(generateUpiQr(e.target.value, tplPaymentPayee, tplPaymentAmount));
                      }}
                      placeholder="merchant@okhdfcbank"
                      className="text-xs mt-1 bg-white dark:bg-zinc-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Payee Business Name</label>
                    <Input
                      value={tplPaymentPayee}
                      onChange={(e) => {
                        setTplPaymentPayee(e.target.value);
                        setTplQrCodeUrl(generateUpiQr(tplPaymentUpiId, e.target.value, tplPaymentAmount));
                      }}
                      placeholder="e.g. Sharma Enterprises"
                      className="text-xs mt-1 bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Payment Amount (₹)</label>
                    <Input
                      type="number"
                      value={tplPaymentAmount}
                      onChange={(e) => {
                        setTplPaymentAmount(e.target.value);
                        setTplQrCodeUrl(generateUpiQr(tplPaymentUpiId, tplPaymentPayee, e.target.value));
                        // Update button text
                        setTplButtons((prev) =>
                          prev.map((btn) =>
                            btn.type === "visit_website"
                              ? { ...btn, text: `💳 Pay ₹${e.target.value} Now` }
                              : btn
                          )
                        );
                      }}
                      placeholder="1499"
                      className="text-xs mt-1 bg-white dark:bg-zinc-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Direct Payment Gateway Link</label>
                    <Input
                      value={tplPaymentLink}
                      onChange={(e) => {
                        setTplPaymentLink(e.target.value);
                        setTplButtons((prev) =>
                          prev.map((btn) =>
                            btn.type === "visit_website" ? { ...btn, url: e.target.value } : btn
                          )
                        );
                      }}
                      placeholder="https://rzp.io/l/... or https://pay.example.com"
                      className="text-xs mt-1 bg-white dark:bg-zinc-900 font-mono"
                    />
                  </div>
                </div>

                {/* QR Code Preview Thumbnail */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                  <div className="h-16 w-16 bg-white p-1 rounded border border-zinc-300 shrink-0">
                    <img
                      src={tplQrCodeUrl || generateUpiQr(tplPaymentUpiId, tplPaymentPayee, tplPaymentAmount)}
                      alt="UPI QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      Dynamic Payment QR Ready
                    </div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">
                      Encodes standard UPI string:{" "}
                      <span className="font-mono text-[10px] text-emerald-600">{`upi://pay?pa=${tplPaymentUpiId}&am=${tplPaymentAmount}`}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Interactive "Choose One" Quick Reply Options */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Interactive &ldquo;Choose One&rdquo; Options (Meta Quick Replies)
              </label>
              <span className="text-[10px] text-zinc-400">Max 3 options</span>
            </div>

            {/* Quick Choice Presets */}
            <div className="flex flex-wrap gap-1.5">
              {CHOICE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTplChoiceOptions([...p.options])}
                  className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 text-zinc-600 dark:text-zinc-300"
                >
                  Preset: {p.name}
                </button>
              ))}
            </div>

            {/* Editable Choice List */}
            <div className="space-y-1.5">
              {tplChoiceOptions.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={choice}
                    onChange={(e) => {
                      const updated = [...tplChoiceOptions];
                      updated[index] = e.target.value;
                      setTplChoiceOptions(updated);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="text-xs h-8 bg-white dark:bg-zinc-900"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setTplChoiceOptions(tplChoiceOptions.filter((_, i) => i !== index));
                    }}
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {tplChoiceOptions.length < 3 && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newChoiceInput}
                  onChange={(e) => setNewChoiceInput(e.target.value)}
                  placeholder="Add custom option (e.g. 🕒 Reschedule to Friday)"
                  className="text-xs h-8 bg-white dark:bg-zinc-900"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newChoiceInput.trim()) {
                      e.preventDefault();
                      setTplChoiceOptions([...tplChoiceOptions, newChoiceInput.trim()]);
                      setNewChoiceInput("");
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (newChoiceInput.trim()) {
                      setTplChoiceOptions([...tplChoiceOptions, newChoiceInput.trim()]);
                      setNewChoiceInput("");
                    }
                  }}
                  className="h-8 text-xs gap-1 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Section 7: Action Buttons (Links & Phone) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
              Action CTA Buttons (Direct Payment Link & Helpline)
            </label>

            {tplButtons.map((btn, idx) => (
              <div key={btn.id} className="flex gap-2">
                <Input
                  value={btn.text}
                  onChange={(e) => {
                    const copy = [...tplButtons];
                    copy[idx] = { ...copy[idx], text: e.target.value };
                    setTplButtons(copy);
                  }}
                  placeholder="Button Label"
                  className="text-xs flex-1 bg-white dark:bg-zinc-900"
                />
                {btn.type === "visit_website" && (
                  <Input
                    value={btn.url || ""}
                    onChange={(e) => {
                      const copy = [...tplButtons];
                      copy[idx] = { ...copy[idx], url: e.target.value };
                      setTplButtons(copy);
                    }}
                    placeholder="URL (https://...)"
                    className="text-xs flex-1 bg-white dark:bg-zinc-900 font-mono"
                  />
                )}
                {btn.type === "call_phone" && (
                  <Input
                    value={btn.phoneNumber || ""}
                    onChange={(e) => {
                      const copy = [...tplButtons];
                      copy[idx] = { ...copy[idx], phoneNumber: e.target.value };
                      setTplButtons(copy);
                    }}
                    placeholder="Phone (+91...)"
                    className="text-xs flex-1 bg-white dark:bg-zinc-900 font-mono"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Section 8: Footer Text */}
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Footer Text (Small muted note)</label>
            <Input
              value={tplFooter}
              onChange={(e) => setTplFooter(e.target.value)}
              placeholder="e.g. Official Service Desk • Helpdesk: +91 98765 43210"
              className="mt-1"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Send Reminder with Schedule Options (Repeated Schedules, One-Time, & Immediate) */}
      <Modal
        isOpen={sendReminderModalOpen}
        onClose={() => setSendReminderModalOpen(false)}
        title={`Send or Schedule WhatsApp Reminder to ${reminderClient?.name}`}
        description={`Target number: ${reminderClient?.phone}. Choose between instant dispatch or automated repeated schedules.`}
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
              {scheduleType === "immediate" ? (
                <>
                  <Send className={`h-4 w-4 ${isSending ? "animate-spin" : ""}`} />
                  {isSending ? "Sending via WhatsApp..." : "Send Reminder Now"}
                </>
              ) : (
                <>
                  <Repeat className="h-4 w-4" />
                  Save & Activate Schedule
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Schedule Options Selector */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              Dispatch & Schedule Strategy
            </label>

            {/* 3 Strategy Modes */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={scheduleType === "immediate" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("immediate")}
                className="text-xs h-8"
              >
                ⚡ Send Now
              </Button>
              <Button
                type="button"
                variant={scheduleType === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("scheduled")}
                className="text-xs h-8"
              >
                📅 One-Time
              </Button>
              <Button
                type="button"
                variant={scheduleType === "recurring" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("recurring")}
                className="text-xs h-8"
              >
                🔁 Repeated
              </Button>
            </div>

            {/* One-Time Schedule Date Picker */}
            {scheduleType === "scheduled" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-zinc-500">Pick Target Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="text-xs bg-white dark:bg-zinc-900"
                />
              </div>
            )}

            {/* Repeated Schedule Builder */}
            {scheduleType === "recurring" && (
              <div className="space-y-3 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Recurrence Frequency</label>
                    <select
                      className="mt-1 w-full rounded-md border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      value={recurrenceFreq}
                      onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                    >
                      <option value="weekly">Weekly (Specific Days)</option>
                      <option value="daily">Daily (Every Day / N Days)</option>
                      <option value="monthly">Monthly (Specific Day of Month)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Time of Day (IST)</label>
                    <Input
                      type="time"
                      value={recurrenceTime}
                      onChange={(e) => setRecurrenceTime(e.target.value)}
                      className="text-xs mt-1 bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                {/* Day of Week Selector if Weekly */}
                {recurrenceFreq === "weekly" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-500">Select Active Weekdays</label>
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAY_NAMES.map((w) => {
                        const isSelected = recurrenceDays.includes(w.day);
                        return (
                          <button
                            key={w.day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (recurrenceDays.length > 1) {
                                  setRecurrenceDays(recurrenceDays.filter((d) => d !== w.day));
                                }
                              } else {
                                setRecurrenceDays([...recurrenceDays, w.day]);
                              }
                            }}
                            className={`h-7 px-2.5 rounded text-xs font-medium border transition-colors ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Day of Month Selector if Monthly */}
                {recurrenceFreq === "monthly" && (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500">Day of the Month (1-31)</label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={recurrenceDayOfMonth}
                      onChange={(e) => setRecurrenceDayOfMonth(parseInt(e.target.value) || 1)}
                      className="text-xs mt-1 bg-white dark:bg-zinc-900"
                    />
                  </div>
                )}

                {/* Meta Business Hours Safeguard */}
                <div className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Meta Business Hours Compliance
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Dispatches only between 09:00 AM – 08:00 PM to protect WhatsApp account health.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={businessHoursOnly}
                    onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                  />
                </div>

                {/* Human-Readable Summary */}
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Active Schedule:</strong> Repeats{" "}
                    {recurrenceFreq === "weekly"
                      ? `weekly every ${recurrenceDays.map((d) => WEEKDAY_NAMES.find((w) => w.day === d)?.label).join(", ")}`
                      : recurrenceFreq === "daily"
                      ? "every day"
                      : `monthly on day ${recurrenceDayOfMonth}`}{" "}
                    at {recurrenceTime} IST until marked Paid.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Select Template */}
          {reminderClient?.customTemplates && reminderClient.customTemplates.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Select Custom Template</label>
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
                      payment_link: tpl.paymentConfig?.paymentLink || "https://pay.example.com",
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
              rows={5}
              value={customReminderMessage}
              onChange={(e) => setCustomReminderMessage(e.target.value)}
              className="mt-1 font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Real-time WhatsApp Simulation Preview */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-semibold uppercase text-zinc-500 mb-2 text-center">
              Live WhatsApp Recipient Simulation ({reminderClient?.phone})
            </div>
            <div className="max-w-md mx-auto scale-90 sm:scale-100 origin-top">
              <WhatsAppPreview
                headerText={selectedClientTemplate?.headerText}
                bodyText={customReminderMessage}
                footerText={selectedClientTemplate?.footerText}
                bannerUrl={selectedClientTemplate?.bannerUrl}
                qrCodeUrl={selectedClientTemplate?.qrCodeUrl}
                paymentConfig={selectedClientTemplate?.paymentConfig}
                choiceOptions={selectedClientTemplate?.choiceOptions}
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
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-emerald-600" />
              Loading history...
            </div>
          ) : reminderHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No reminder records logged yet for this client.
            </div>
          ) : (
            reminderHistory.map((rem) => (
              <div
                key={rem.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant={rem.status === "sent" ? "default" : rem.status === "scheduled" ? "outline" : "destructive"}
                    className="text-[10px] uppercase font-mono"
                  >
                    {rem.status}
                  </Badge>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {new Date(rem.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-sans whitespace-pre-wrap line-clamp-3">
                  {rem.renderedMessage}
                </p>
                {rem.evolutionMessageId && (
                  <div className="text-[10px] text-zinc-400 font-mono truncate">
                    Msg ID: {rem.evolutionMessageId}
                  </div>
                )}
                {rem.errorMessage && (
                  <div className="text-[10px] text-red-500 font-mono">
                    Error: {rem.errorMessage}
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
