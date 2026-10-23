import { z } from "zod";

/**
 * Normalizes phone numbers to standard international E.164-like format (e.g. +919876543210)
 * Handles international codes, removes spaces, dashes, brackets, and leading zeroes.
 */
export function normalizePhoneNumber(input: string, defaultCountryCode = "91"): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return { isValid: false, normalized: "", error: "Phone number is empty" };
  }

  // Remove whitespace, hyphens, brackets, dots
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, "");

  // If starts with 00, replace with +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // If already starts with +, remove + to inspect digits
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d{7,15}$/.test(digitsOnly)) {
      return { isValid: false, normalized: "", error: "Invalid international number length (must be 7-15 digits)" };
    }
    return { isValid: true, normalized: "+" + digitsOnly };
  }

  // If starts with leading 0 (domestic local format, e.g. 09876543210 or UK 07...)
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.replace(/^0+/, "");
  }

  // Strip all non-digits
  cleaned = cleaned.replace(/\D/g, "");

  if (cleaned.length < 7 || cleaned.length > 15) {
    return { isValid: false, normalized: "", error: "Invalid digit count (must be 7-15 digits)" };
  }

  // If it doesn't have country code (e.g., 10 digits for India/US)
  if (cleaned.length === 10 && defaultCountryCode) {
    cleaned = defaultCountryCode.replace(/\D/g, "") + cleaned;
  }

  return { isValid: true, normalized: "+" + cleaned };
}

/**
 * Extracts {{variable_name}} tokens from template text
 */
export function extractTemplateVariables(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{([a-zA-Z0-9_\-]+)\}\}/g);
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map((m) => m.slice(2, -2).trim())));
  return unique;
}

/**
 * Generates tracking link with UTM parameters
 */
export function buildTrackingUrl(
  baseUrl: string,
  tracking?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  }
): string {
  if (!baseUrl) return "";
  try {
    const url = new URL(baseUrl);
    if (tracking?.utm_source) url.searchParams.set("utm_source", tracking.utm_source);
    if (tracking?.utm_medium) url.searchParams.set("utm_medium", tracking.utm_medium);
    if (tracking?.utm_campaign) url.searchParams.set("utm_campaign", tracking.utm_campaign);
    if (tracking?.utm_content) url.searchParams.set("utm_content", tracking.utm_content);
    if (tracking?.utm_term) url.searchParams.set("utm_term", tracking.utm_term);
    return url.toString();
  } catch {
    // If not valid full URL, fallback
    return baseUrl;
  }
}

/**
 * Zod Schemas
 */
export const phoneValidationSchema = z.string().refine((val) => {
  const { isValid } = normalizePhoneNumber(val);
  return isValid;
}, {
  message: "Invalid phone number format. Must be a valid international number.",
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneValidationSchema,
  email: z.string().email().optional().or(z.literal("")),
  countryCode: z.string().optional().default("91"),
  tags: z.array(z.string()).default([]),
  segment: z.string().optional().default("All Customers"),
  optedIn: z.boolean().default(true),
  optedOut: z.boolean().default(false),
  optOutReason: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const recurringScheduleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "custom_cron"]).default("daily"),
  timeOfDay: z.string().default("10:00"),
  timezone: z.string().default("Asia/Kolkata"),
  daysOfWeek: z.array(z.number()).optional(),
  dayOfMonth: z.number().optional(),
  interval: z.number().optional(),
  cronExpression: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  endCondition: z.enum(["never", "by_date", "after_occurrences"]).default("never"),
  endAfterOccurrences: z.number().optional(),
  sendWithinBusinessHours: z.boolean().default(true),
});

export const paymentConfigSchema = z.object({
  enabled: z.boolean().default(false),
  upiId: z.string().optional(),
  payeeName: z.string().optional(),
  amount: z.number().optional(),
  paymentLink: z.string().optional(),
  qrCodeUrl: z.string().optional(),
});

export const templateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters"),
  description: z.string().optional(),
  language: z.string().default("en"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("MARKETING"),
  headerText: z.string().optional(),
  bodyText: z.string().min(5, "Body text must be at least 5 characters"),
  footerText: z.string().optional(),
  exampleValues: z.record(z.string(), z.string()).optional().default({}),
  mediaType: z.enum(["image", "video", "document", "none"]).default("none"),
  mediaUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bannerUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  qrCodeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  paymentConfig: paymentConfigSchema.optional(),
  choiceOptions: z.array(z.string()).optional().default([]),
  buttons: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["visit_website", "call_phone", "copy_coupon", "quick_reply"]),
      text: z.string().min(1, "Button label is required"),
      url: z.string().url().optional().or(z.literal("")),
      phoneNumber: z.string().optional().or(z.literal("")),
      couponCode: z.string().optional().or(z.literal("")),
    })
  ).optional().default([]),
});

export const campaignSchema = z.object({
  name: z.string().min(2, "Campaign name must be at least 2 characters"),
  description: z.string().optional(),
  templateId: z.string().min(1, "Please select a template"),
  audience: z.object({
    type: z.enum(["all_opted_in", "segment", "csv_upload", "manual_selection"]),
    segmentId: z.string().optional(),
    customerIds: z.array(z.string()).optional(),
  }),
  variables: z.record(z.string(), z.string()).default({}),
  media: z.object({
    type: z.enum(["image", "video", "document", "none"]).default("none"),
    url: z.string().url().optional().or(z.literal("")),
    caption: z.string().optional(),
  }).optional(),
  tracking: z.object({
    utm_source: z.string().default("whatsapp"),
    utm_medium: z.string().default("campaign"),
    utm_campaign: z.string().min(1, "UTM Campaign tag is required"),
    utm_content: z.string().optional(),
  }).optional(),
  schedule: z.object({
    type: z.enum(["immediate", "scheduled", "recurring"]).default("immediate"),
    scheduledAt: z.string().optional(),
    timezone: z.string().default("UTC"),
    recurring: recurringScheduleSchema.optional(),
  }),
  throttling: z.object({
    batchSize: z.number().min(1).max(500).default(20),
    delaySeconds: z.number().min(1).max(3600).default(5),
    maxPerMinute: z.number().min(1).max(1000).default(60),
    maxCampaignSize: z.number().optional(),
  }).default({
    batchSize: 20,
    delaySeconds: 5,
    maxPerMinute: 60,
  }),
});
