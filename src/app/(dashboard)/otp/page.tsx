"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WhatsAppPreview } from "@/components/whatsapp/whatsapp-preview";
import {
  KeyRound,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Copy,
  AlertTriangle,
  Lock,
  Webhook,
  Activity,
  Layers,
} from "lucide-react";
import type { OtpVerification, WebhookLog } from "@/types";
import { toast } from "sonner";

export default function OtpDashboardPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "webhooks" | "templates">("simulator");

  // Send OTP form
  const [phone, setPhone] = useState("+919876543210");
  const [purpose, setPurpose] = useState("login");
  const [isSending, setIsSending] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [activeOtpPhone, setActiveOtpPhone] = useState("");

  // Countdown & Cooldown timers
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Verify form
  const [inputCode, setInputCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "idle" | "verified" | "invalid" | "expired" | "locked";
    message?: string;
    remainingAttempts?: number;
  }>({ status: "idle" });

  // Webhook and Audit logs
  const [otpLogs, setOtpLogs] = useState<OtpVerification[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Tick timers
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
      setCooldown((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (sec: number | null) => {
    if (sec === null || sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const [otpRes, hookRes] = await Promise.all([
        fetch("/api/otp/logs"),
        fetch("/api/webhooks/logs"),
      ]);
      const otpJson = await otpRes.json();
      const hookJson = await hookRes.json();
      if (otpJson.success) setOtpLogs(otpJson.data || []);
      if (hookJson.success) setWebhookLogs(hookJson.data || []);
    } catch {
      // non-critical
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Dispatch OTP
  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    setIsSending(true);
    setVerificationResult({ status: "idle" });
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Verification OTP sent via WhatsApp to ${phone}!`);
        setVerificationId(json.data.verificationId);
        setActiveOtpPhone(json.data.phone);
        setExpiresIn(json.data.expiresInSeconds || 300);
        setCooldown(json.data.cooldownSeconds || 60);
        setInputCode("");
        loadLogs();
      } else {
        toast.error(json.error?.message || "Failed to dispatch OTP");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to dispatch OTP");
    } finally {
      setIsSending(false);
    }
  };

  // Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!inputCode.trim()) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: verificationId || undefined,
          phone: activeOtpPhone || phone,
          code: inputCode.trim(),
          purpose,
        }),
      });
      const json = await res.json();

      if (json.success && json.verified) {
        toast.success("OTP Verified Successfully!");
        setVerificationResult({
          status: "verified",
          message: "Code verified successfully! Authentication passed.",
        });
        loadLogs();
      } else {
        const errCode = json.error?.code;
        const msg = json.error?.message || "Verification failed";
        toast.error(msg);

        if (errCode === "OTP_EXPIRED") {
          setVerificationResult({ status: "expired", message: msg });
        } else if (errCode === "MAX_ATTEMPTS_EXCEEDED") {
          setVerificationResult({ status: "locked", message: msg, remainingAttempts: 0 });
        } else {
          setVerificationResult({
            status: "invalid",
            message: msg,
            remainingAttempts: json.error?.remainingAttempts,
          });
        }
        loadLogs();
      }
    } catch (e: any) {
      toast.error(e.message || "Verification request failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) {
      toast.info(`Please wait ${cooldown} seconds before requesting a new code.`);
      return;
    }
    await handleSendOtp();
  };

  // Webhook Handshake Tester
  const handleTestWebhookHandshake = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const challengeToken = `hub_challenge_${Math.random().toString(36).substring(2, 8)}`;
      const res = await fetch(
        `/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=whatsapp_verify_token_2026&hub.challenge=${challengeToken}`
      );
      const text = await res.text();
      if (res.ok && text === challengeToken) {
        setWebhookTestResult(
          `✅ 200 OK — Handshake passed! Webhook returned challenge token: "${text}"`
        );
        toast.success("Webhook handshake verified successfully!");
      } else {
        setWebhookTestResult(`❌ Webhook returned HTTP ${res.status}: ${text}`);
        toast.error("Webhook verification check failed");
      }
    } catch (e: any) {
      setWebhookTestResult(`❌ Error connecting to webhook: ${e.message}`);
      toast.error("Connection error");
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl flex items-center gap-2.5">
            <KeyRound className="h-7 w-7 text-emerald-600" />
            WhatsApp OTP & Webhook Service
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Production-ready OTP engine with cryptographic SHA-256 verification, strict Time-To-Live (TTL) expiry, anti-abuse rate limiting, and real-time webhook auditing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoadingLogs} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? "animate-spin" : ""}`} />
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <Button
          size="sm"
          variant={activeTab === "simulator" ? "default" : "ghost"}
          onClick={() => setActiveTab("simulator")}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          OTP Live Workbench
        </Button>
        <Button
          size="sm"
          variant={activeTab === "webhooks" ? "default" : "ghost"}
          onClick={() => setActiveTab("webhooks")}
          className="gap-2"
        >
          <Webhook className="h-4 w-4" />
          Webhooks & Handshake
        </Button>
        <Button
          size="sm"
          variant={activeTab === "templates" ? "default" : "ghost"}
          onClick={() => setActiveTab("templates")}
          className="gap-2"
        >
          <Layers className="h-4 w-4" />
          Meta Authentication Templates
        </Button>
      </div>

      {/* TAB 1: OTP Live Workbench */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dispatch & Verify Panel */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-600" />
                  1. Dispatch WhatsApp OTP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-zinc-500">Destination Mobile Phone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-zinc-500">Purpose</label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="login">User Login / Authentication</option>
                      <option value="transaction">Payment / Transaction Authorization</option>
                      <option value="verification">Account Setup / Mobile Verification</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-zinc-500">
                    TTL Expiry: <strong className="text-zinc-700 dark:text-zinc-300">5 minutes (300s)</strong> • Cooldown: <strong className="text-zinc-700 dark:text-zinc-300">60s</strong>
                  </div>
                  <Button
                    onClick={handleSendOtp}
                    disabled={isSending || (cooldown > 0 && activeOtpPhone === phone)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className={`h-4 w-4 ${isSending ? "animate-spin" : ""}`} />
                    {isSending ? "Dispatching..." : cooldown > 0 && activeOtpPhone === phone ? `Wait ${cooldown}s` : "Send WhatsApp OTP"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Verification Box */}
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    2. Verify OTP Code
                  </CardTitle>
                  {expiresIn !== null && (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span className={expiresIn <= 30 ? "text-red-500 font-bold" : "text-zinc-600 dark:text-zinc-400"}>
                        Code expires in: {formatSeconds(expiresIn)}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Enter 6-Digit Code</label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="font-mono text-center tracking-widest text-lg font-bold max-w-[200px]"
                    />
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={isVerifying || inputCode.length !== 6 || expiresIn === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1 sm:flex-initial"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isVerifying ? "Verifying..." : "Verify Code"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0}
                      className="gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend Code"}
                    </Button>
                  </div>
                </div>

                {/* Result Feedback Banner */}
                {verificationResult.status !== "idle" && (
                  <div
                    className={`rounded-lg p-3 text-xs flex items-start gap-2.5 ${
                      verificationResult.status === "verified"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                        : verificationResult.status === "expired"
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                        : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900"
                    }`}
                  >
                    {verificationResult.status === "verified" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : verificationResult.status === "expired" ? (
                      <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <div>
                      <div className="font-semibold">{verificationResult.message}</div>
                      {verificationResult.remainingAttempts !== undefined && (
                        <div className="mt-0.5 opacity-90">
                          {verificationResult.remainingAttempts} attempt(s) remaining before security lockout.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Log Table */}
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Recent OTP Verifications (PostgreSQL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="py-2">Phone</th>
                        <th className="py-2">Purpose</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Attempts</th>
                        <th className="py-2">Expires</th>
                        <th className="py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                      {otpLogs.slice(0, 8).map((log) => (
                        <tr key={log.id}>
                          <td className="py-2 text-zinc-900 dark:text-zinc-100">{log.phone}</td>
                          <td className="py-2 text-zinc-500">{log.purpose}</td>
                          <td className="py-2">
                            <Badge
                              variant={
                                log.status === "verified"
                                  ? "success"
                                  : log.status === "expired"
                                  ? "secondary"
                                  : log.status === "max_attempts_exceeded"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px] capitalize font-sans"
                            >
                              {log.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2 text-zinc-500">{log.attempts}/{log.maxAttempts}</td>
                          <td className="py-2 text-zinc-500">{new Date(log.expiresAt).toLocaleTimeString()}</td>
                          <td className="py-2 text-zinc-400">{new Date(log.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Mobile Simulation */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
                Authentication Message Preview
              </h2>
              <WhatsAppPreview
                headerText="🔒 Security Verification"
                bodyText={`Your Campaign Pro verification code is: *849201*.\n\n⏱️ This code will expire in 5 minutes.\n\n⚠️ For your security, do not share this code with anyone.`}
                footerText="Never share your OTP with anyone"
                buttons={[
                  {
                    id: "btn_copy",
                    type: "copy_coupon",
                    text: "Copy Code",
                    couponCode: "849201",
                  },
                ]}
                senderName="Security Verification Bot"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Webhooks & Handshake Tester */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-5 w-5 text-emerald-600" />
                Webhook Configuration & Verification Handshake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-zinc-500">
                Use these endpoints to connect Meta WhatsApp Cloud API, Evolution API, or n8n webhooks. Delivery statuses (sent, delivered, read, failed) are automatically processed and recorded.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Primary WhatsApp Webhook URL:
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white dark:bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 flex-1 overflow-x-auto">
                      /api/webhooks/whatsapp
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/whatsapp`)}
                      className="h-8 w-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Dedicated OTP Delivery Webhook:
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white dark:bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 flex-1 overflow-x-auto">
                      /api/webhooks/otp
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/otp`)}
                      className="h-8 w-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Webhook Verification Token (hub.verify_token):
                  </div>
                  <code className="text-xs font-mono font-bold text-emerald-600">
                    whatsapp_verify_token_2026
                  </code>
                </div>
                <Button
                  onClick={handleTestWebhookHandshake}
                  disabled={isTestingWebhook}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                >
                  <ShieldCheck className={`h-3.5 w-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
                  {isTestingWebhook ? "Testing..." : "Test Webhook Handshake"}
                </Button>
              </div>

              {webhookTestResult && (
                <div className="p-3 rounded-lg text-xs font-mono bg-zinc-900 text-zinc-100 border border-zinc-800">
                  {webhookTestResult}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook Activity Table */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Incoming Webhook Logs ({webhookLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {webhookLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No incoming webhook events received yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {webhookLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50 text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {log.eventType}
                          </Badge>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Source: {log.source}
                          </span>
                        </div>
                        <pre className="mt-1 text-[11px] font-mono text-zinc-500 line-clamp-2">
                          {JSON.stringify(log.payload)}
                        </pre>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Meta Authentication Templates */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                1. WhatsApp One-Time Password (OTP) Login
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                AUTHENTICATION
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              Standard Meta-compliant verification template equipped with single-click Copy Code action button.
            </p>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-xs font-mono leading-relaxed border border-zinc-100 dark:border-zinc-800">
              {`Your {{app_name}} verification code is: *{{otp_code}}*.\n\n⏱️ This code will expire in {{expiry_minutes}} minutes.\n\n⚠️ For your security, do not share this code with anyone.`}
            </div>
            <div className="text-[11px] text-zinc-400">
              Action Button: <strong className="text-emerald-600">Copy Code (Clipboard)</strong>
            </div>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                2. Transaction Authorization OTP
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                AUTHENTICATION
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              Used when authorizing high-value transactions, invoice payments, or sensitive operations.
            </p>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-xs font-mono leading-relaxed border border-zinc-100 dark:border-zinc-800">
              {`Your verification code to authorize payment of {{amount}} for {{reference}} is: *{{otp_code}}*.\n\n⏱️ Valid for {{expiry_minutes}} minutes.\n\nDo not share this code with anyone.`}
            </div>
            <div className="text-[11px] text-zinc-400">
              Action Button: <strong className="text-emerald-600">Copy Code (Clipboard)</strong>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
