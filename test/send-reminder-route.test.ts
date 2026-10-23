import { describe, it, expect, vi } from "vitest";

vi.mock("@/config/env", () => ({
  env: {
    EVOLUTION_API_URL: "https://mock-evo.example.com",
    EVOLUTION_API_KEY: "mock_key_123",
    EVOLUTION_INSTANCE_NAME: "MockInstance",
    N8N_BASE_URL: "",
  },
}));

vi.mock("@/lib/db", () => ({
  recordClientReminderInDb: vi.fn().mockImplementation(async (data: any) => ({
    id: "rem_test_123",
    ...data,
    createdAt: new Date().toISOString(),
  })),
  updateClientInDb: vi.fn().mockResolvedValue(true),
  getClientByIdFromDb: vi.fn().mockResolvedValue(null),
}));

import { POST } from "@/app/api/clients/send-reminder/route";

describe("Send Reminder Route Handler", () => {
  it("formats and prepares dispatch with banner, payment links, QR code and actions", async () => {
    // Mock fetch for Evolution API
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: { id: "EVO_TEST_MSG_123" } }),
      status: 200,
    });
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      clientId: "client_test_123",
      phone: "+918008638625",
      clientName: "Naveen",
      message: "Please find your maintenance bill for AC Service.",
      headerText: "🛠️ Scheduled Maintenance & Charges Due",
      footerText: "Official Helpdesk: +91 98765 43210",
      bannerUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
      qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay",
      paymentConfig: {
        enabled: true,
        upiId: "naveen.ac@okhdfcbank",
        payeeName: "Naveen",
        amount: 1499,
        paymentLink: "https://pay.example.com/inv/8625",
      },
      buttons: [
        { id: "b1", type: "visit_website", text: "💳 Pay ₹1499 Now", url: "https://pay.example.com/inv/8625" },
        { id: "b2", type: "call_phone", text: "📞 Call Helpline", phoneNumber: "+919876543210" },
      ],
      choiceOptions: ["✅ Paid Already", "💳 Pay Online Now", "📞 Request Callback"],
      scheduleType: "immediate",
    };

    const req = new Request("http://localhost:3000/api/clients/send-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const json = await res.json();
    if (res.status !== 200) {
      console.error("Test Route Error:", json);
    }
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify mockFetch was called
    expect(mockFetch).toHaveBeenCalled();
    const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(firstCallBody.number).toBe("918008638625");
    expect(firstCallBody.mediatype).toBe("image");
    expect(firstCallBody.caption).toContain("https://pay.example.com/inv/8625");
    expect(firstCallBody.caption).toContain("naveen.ac@okhdfcbank");
    expect(firstCallBody.caption).toContain("Pay ₹1499 Now");
    expect(firstCallBody.caption).toContain("1. ✅ Paid Already");

    // Verify companion QR code was dispatched as the second call
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondCallBody.number).toBe("918008638625");
    expect(secondCallBody.mediatype).toBe("image");
    expect(secondCallBody.media).toContain("qrserver.com");
    expect(secondCallBody.caption).toContain("SCAN & PAY");

    vi.unstubAllGlobals();
  });

  it("does NOT send companion QR code when payment QR is unchecked (paymentConfig.enabled = false)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: { id: "EVO_TEST_MSG_456" } }),
      status: 200,
    });
    vi.stubGlobal("fetch", mockFetch);

    const payload = {
      clientId: "client_test_456",
      phone: "+918008638625",
      clientName: "Naveen",
      message: "Please find your general service update notice.",
      bannerUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
      // Payment QR unchecked / disabled:
      paymentConfig: {
        enabled: false,
      },
      scheduleType: "immediate",
    };

    const req = new Request("http://localhost:3000/api/clients/send-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify ONLY ONE message (the banner) was dispatched, and NO companion QR
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(firstCallBody.mediatype).toBe("image");
    expect(firstCallBody.caption).not.toContain("SCAN & PAY");

    vi.unstubAllGlobals();
  });
});
