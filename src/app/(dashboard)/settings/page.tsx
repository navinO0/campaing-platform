"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/n8n/test-connection", { method: "POST" });
      const json = await res.json();
      setTestResult(json);
      if (json.success) {
        toast.success("n8n Webhook connectivity established!");
      } else {
        toast.warning(
          "n8n Webhook responded or is awaiting activation. Fallback engine ready."
        );
      }
    } catch {
      toast.error("Failed to execute connection test");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Integrations & System Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Verify secure n8n connectivity, Evolution API integration status, and security headers.
        </p>
      </div>

      {/* n8n Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 rounded-lg">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">n8n Orchestration Server</CardTitle>
                <p className="text-xs text-zinc-500">Primary webhook engine for bulk messaging</p>
              </div>
            </div>
            <Badge variant="success" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="text-zinc-400 uppercase font-semibold">n8n Base URL</span>
              <div className="font-mono text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                https://n8n-ktxhkuiuzp3gnwgrggc15ekz.navin.lol
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="text-zinc-400 uppercase font-semibold">Webhook Authentication</span>
              <div className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                <Lock className="h-3 w-3" />
                HMAC SHA-256 + Bearer Secret
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              API secrets are encrypted server-side and never exposed to browser context.
            </div>
            <Button
              disabled={testing}
              onClick={handleTestConnection}
              className="gap-2"
              size="sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono space-y-1">
              <div className="font-bold text-zinc-700 dark:text-zinc-300">Connection Test Result:</div>
              <div className="text-zinc-600 dark:text-zinc-400">
                Webhook: {testResult.webhookTested}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400">
                Status: {testResult.status} (Success: {String(testResult.success)})
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Transport Abstraction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/40 text-blue-700 rounded-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp Transport Layer</CardTitle>
                <p className="text-xs text-zinc-500">Managed via n8n orchestrator nodes</p>
              </div>
            </div>
            <Badge variant="outline">Multi-Provider Ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
          <p>
            The Next.js application communicates strictly through n8n webhooks. Direct access to
            Evolution API or Meta Cloud credentials is fully abstracted.
          </p>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-1 font-mono text-[11px]">
            <div>Active Provider: Evolution API</div>
            <div>Instance: Naveen kumar kambham</div>
            <div>Mode: Isolated proxy (No credentials leaked to browser)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
