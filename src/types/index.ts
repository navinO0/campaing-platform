export type WhatsAppProvider = "evolution" | "meta_cloud_api";

export type CampaignStatus =
  | "Draft"
  | "Scheduled"
  | "Running"
  | "Paused"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type MediaType = "image" | "video" | "document" | "none";

export type ButtonType = "visit_website" | "call_phone" | "copy_coupon" | "quick_reply";

export interface TemplateButton {
  id: string;
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
  couponCode?: string;
}

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: Record<string, string>;
  buttons?: TemplateButton[];
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: "Approved" | "Pending" | "Rejected" | "Draft";
  headerText?: string;
  bodyText: string;
  footerText?: string;
  variables: string[];
  exampleValues?: Record<string, string>;
  mediaType: MediaType;
  mediaUrl?: string;
  buttons?: TemplateButton[];
  components?: TemplateComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  countryCode: string;
  tags: string[];
  segment?: string;
  source?: string;
  optedIn: boolean;
  optedOut: boolean;
  optedOutAt?: string | null;
  optOutReason?: string | null;
  lastContactedAt?: string | null;
  lastMessageStatus?: "delivered" | "read" | "failed" | "queued" | null;
  purchaseCount?: number;
  totalSpent?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  customerCount: number;
  filter: {
    optedIn?: boolean;
    tags?: string[];
    segment?: string;
    source?: string;
    lastContactedBefore?: string;
    lastContactedAfter?: string;
    minSpent?: number;
    maxSpent?: number;
    minPurchases?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAudience {
  type: "all_opted_in" | "segment" | "csv_upload" | "manual_selection";
  segmentId?: string;
  customerIds?: string[];
  csvData?: Array<{ name: string; phone: string; [key: string]: unknown }>;
}

export interface CampaignTracking {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
}

export interface CampaignSchedule {
  type: "immediate" | "scheduled";
  scheduledAt?: string;
  timezone?: string;
}

export interface CampaignThrottling {
  batchSize: number;
  delaySeconds: number;
  maxPerMinute: number;
  maxCampaignSize?: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  templateId: string;
  templateName?: string;
  audience: CampaignAudience;
  variables: Record<string, string>;
  media?: {
    type: MediaType;
    url: string;
    caption?: string;
  };
  tracking?: CampaignTracking;
  schedule: CampaignSchedule;
  throttling?: CampaignThrottling;
  evolutionInstance?: string;
  evolutionApiUrl?: string;
  stats: {
    totalAudience: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    optedOut: number;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface CampaignLog {
  id: string;
  campaignId: string;
  customerId: string;
  customerName: string;
  phone: string;
  message: string;
  templateName: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed" | "opted_out" | "skipped";
  error?: string | null;
  timestamp: string;
}

export interface DashboardStats {
  totalCustomers: number;
  optedInCustomers: number;
  campaignsSent: number;
  messagesSent: number;
  delivered: number;
  read: number;
  failed: number;
  optedOut: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  optOutRate: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  company?: string;
  serviceType: string;
  chargesAmount: number;
  dueDate?: string | null;
  notes?: string;
  status: "active" | "pending_payment" | "overdue" | "inactive";
  customTemplates?: ClientTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientTemplate {
  id: string;
  clientId: string;
  clientPhone: string;
  title: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  headerText?: string;
  bodyText: string;
  footerText?: string;
  variables: Record<string, string>;
  mediaType: MediaType;
  mediaUrl?: string;
  buttons: TemplateButton[];
  lastSentAt?: string | null;
  sentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientReminder {
  id: string;
  clientId: string;
  clientTemplateId?: string | null;
  phone: string;
  clientName: string;
  renderedMessage: string;
  status: "sent" | "failed" | "pending";
  evolutionMessageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}
