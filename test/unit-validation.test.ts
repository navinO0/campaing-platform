import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  extractTemplateVariables,
  buildTrackingUrl,
  templateSchema,
  campaignSchema,
} from "@/lib/validation";
import {
  maskPhoneNumber,
  generateHmacSignature,
  generateSecureOtp,
  generateSalt,
  hashOtp,
  verifyOtpHash,
  verifyWebhookSignature,
} from "@/lib/security";

describe("Validation and Utility Unit Tests", () => {
  it("validates enterprise templates with headers, footers, and example values", () => {
    const rawTemplate = {
      name: "Service Maintenance Notice",
      description: "Scheduled maintenance reminder with charges",
      category: "UTILITY",
      headerText: "🛠️ Scheduled Maintenance",
      bodyText: "Hello {{customer_name}}, maintenance for {{service_name}} is ₹{{amount_due}}.",
      footerText: "Reply STOP to unsubscribe",
      exampleValues: { customer_name: "Aarav", service_name: "AC", amount_due: "1499" },
      mediaType: "none",
      buttons: [
        { id: "b1", type: "visit_website", text: "Pay Now", url: "https://pay.example.com" }
      ]
    };

    const parsed = templateSchema.safeParse(rawTemplate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.headerText).toBe("🛠️ Scheduled Maintenance");
      expect(parsed.data.footerText).toBe("Reply STOP to unsubscribe");
      expect(parsed.data.exampleValues?.amount_due).toBe("1499");
    }
  });
  it("normalizes international Indian phone numbers correctly", () => {
    const res1 = normalizePhoneNumber("+919876543210");
    expect(res1.isValid).toBe(true);
    expect(res1.normalized).toBe("+919876543210");

    const res2 = normalizePhoneNumber("9876543210", "91");
    expect(res2.isValid).toBe(true);
    expect(res2.normalized).toBe("+919876543210");

    const res3 = normalizePhoneNumber("+91 98765-43210");
    expect(res3.isValid).toBe(true);
    expect(res3.normalized).toBe("+919876543210");
  });

  it("normalizes non-Indian international phone numbers without assuming India", () => {
    const ukNumber = normalizePhoneNumber("+447700900123");
    expect(ukNumber.isValid).toBe(true);
    expect(ukNumber.normalized).toBe("+447700900123");

    const usNumber = normalizePhoneNumber("+14155552671");
    expect(usNumber.isValid).toBe(true);
    expect(usNumber.normalized).toBe("+14155552671");
  });

  it("rejects invalid or too short phone numbers", () => {
    const invalid = normalizePhoneNumber("123");
    expect(invalid.isValid).toBe(false);
  });

  it("extracts unique variables from WhatsApp template texts", () => {
    const text =
      "Hello {{customer_name}}, here is {{discount}} off on {{product_name}}. Shop {{product_link}}!";
    const vars = extractTemplateVariables(text);
    expect(vars).toEqual(["customer_name", "discount", "product_name", "product_link"]);
  });

  it("generates tracked promotional URLs with UTM tags", () => {
    const url = buildTrackingUrl("https://example.com/diwali", {
      utm_source: "whatsapp",
      utm_medium: "campaign",
      utm_campaign: "diwali-mega-sale",
    });
    expect(url).toContain("utm_source=whatsapp");
    expect(url).toContain("utm_medium=campaign");
    expect(url).toContain("utm_campaign=diwali-mega-sale");
  });

  it("masks phone numbers in structured logs to protect privacy", () => {
    const masked = maskPhoneNumber("+919876543210");
    expect(masked.endsWith("3210")).toBe(true);
    expect(masked).toContain("********");
  });

  it("computes valid HMAC SHA-256 webhook signatures", () => {
    const payload = JSON.stringify({ action: "test" });
    const signature = generateHmacSignature(payload, "secret123");
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // SHA-256 hex length
  });

  it("generates cryptographically secure 6-digit numeric OTPs", () => {
    const code = generateSecureOtp(6);
    expect(code).toMatch(/^\d{6}$/);
    const num = parseInt(code, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  it("hashes OTP with salt and verifies code correctly using timing-safe comparison", () => {
    const code = "849201";
    const salt = generateSalt(16);
    const hash = hashOtp(code, salt);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 hex

    // Valid code verification
    expect(verifyOtpHash(code, salt, hash)).toBe(true);

    // Invalid code verification
    expect(verifyOtpHash("000000", salt, hash)).toBe(false);
    expect(verifyOtpHash("849202", salt, hash)).toBe(false);
  });

  it("verifies webhook signatures with and without sha256= prefix", () => {
    const payload = JSON.stringify({ event: "message.status", status: "delivered" });
    const secret = "whsec_supersecret_key";
    const signature = generateHmacSignature(payload, secret);

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, `sha256=${signature}`, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, "invalid_sig_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", secret)).toBe(false);
  });

  it("validates templates with banner images, payment QR configs, and choice options", () => {
    const parsed = templateSchema.safeParse({
      name: "ac_service_maintenance_banner_qr",
      category: "UTILITY",
      bodyText: "Dear {{client_name}}, your maintenance fee is due. Pay online or reply below.",
      bannerUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e",
      qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay",
      paymentConfig: {
        enabled: true,
        upiId: "sharma@okhdfcbank",
        payeeName: "Sharma Enterprises",
        amount: 1499,
        paymentLink: "https://pay.example.com/inv/8912",
      },
      choiceOptions: ["✅ Paid Already", "💳 Pay Online Now", "📞 Request Callback"],
      buttons: [
        {
          id: "btn_pay",
          type: "visit_website",
          text: "💳 Pay ₹1,499 Now",
          url: "https://pay.example.com/inv/8912",
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bannerUrl).toContain("unsplash.com");
      expect(parsed.data.choiceOptions).toHaveLength(3);
      expect(parsed.data.paymentConfig?.enabled).toBe(true);
      expect(parsed.data.paymentConfig?.amount).toBe(1499);
    }
  });

  it("validates campaigns with repeated / recurring schedules", () => {
    const parsed = campaignSchema.safeParse({
      name: "Weekly Service Reminder Blast",
      templateId: "tpl_service_maintenance_charges_01",
      audience: {
        type: "all_opted_in",
      },
      schedule: {
        type: "recurring",
        timezone: "Asia/Kolkata",
        recurring: {
          frequency: "weekly",
          timeOfDay: "10:00",
          timezone: "Asia/Kolkata",
          daysOfWeek: [1, 4], // Monday and Thursday
          sendWithinBusinessHours: true,
          endCondition: "never",
        },
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schedule.type).toBe("recurring");
      expect(parsed.data.schedule.recurring?.frequency).toBe("weekly");
      expect(parsed.data.schedule.recurring?.daysOfWeek).toEqual([1, 4]);
      expect(parsed.data.schedule.recurring?.sendWithinBusinessHours).toBe(true);
    }
  });
});
