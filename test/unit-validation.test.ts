import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  extractTemplateVariables,
  buildTrackingUrl,
  templateSchema,
} from "@/lib/validation";
import { maskPhoneNumber, generateHmacSignature } from "@/lib/security";

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
});
