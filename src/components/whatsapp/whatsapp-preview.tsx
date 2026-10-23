"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Monitor,
  CheckCheck,
  ExternalLink,
  Phone,
  Copy,
  QrCode,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaType, TemplateButton, PaymentConfig } from "@/types";

interface WhatsAppPreviewProps {
  headerText?: string;
  bodyText: string;
  footerText?: string;
  variables?: Record<string, string>;
  mediaType?: MediaType;
  mediaUrl?: string;
  bannerUrl?: string;
  qrCodeUrl?: string;
  paymentConfig?: PaymentConfig;
  choiceOptions?: string[];
  buttons?: TemplateButton[];
  senderName?: string;
}

export function WhatsAppPreview({
  headerText,
  bodyText,
  footerText,
  variables = {},
  mediaType = "none",
  mediaUrl,
  bannerUrl,
  qrCodeUrl,
  paymentConfig,
  choiceOptions = [],
  buttons = [],
  senderName = "Brand Promotional Bot",
}: WhatsAppPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "desktop">("mobile");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Interpolate variable placeholders like {{customer_name}}
  const interpolate = (rawText?: string) => {
    if (!rawText) return "";
    let replaced = rawText;
    Object.entries(variables).forEach(([k, v]) => {
      const reg = new RegExp(`\\{\\{${k}\\}\\}`, "g");
      replaced = replaced.replace(reg, v || `[${k}]`);
    });
    return replaced;
  };

  const activeBanner = bannerUrl || (mediaType === "image" ? mediaUrl : undefined);
  const activeQr = qrCodeUrl || paymentConfig?.qrCodeUrl;
  const isPaymentEnabled = Boolean(paymentConfig?.enabled || activeQr);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
        <Button
          type="button"
          variant={deviceMode === "mobile" ? "default" : "ghost"}
          size="sm"
          onClick={() => setDeviceMode("mobile")}
          className="gap-1.5"
        >
          <Smartphone className="h-3.5 w-3.5" />
          Mobile View
        </Button>
        <Button
          type="button"
          variant={deviceMode === "desktop" ? "default" : "ghost"}
          size="sm"
          onClick={() => setDeviceMode("desktop")}
          className="gap-1.5"
        >
          <Monitor className="h-3.5 w-3.5" />
          Desktop View
        </Button>
      </div>

      {/* Frame simulation */}
      <div
        className={
          deviceMode === "mobile"
            ? "w-[360px] rounded-[36px] border-8 border-zinc-800 bg-zinc-950 p-2 shadow-2xl relative"
            : "w-full max-w-lg rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-900 p-3 shadow-xl"
        }
      >
        {/* Mobile Camera notch */}
        {deviceMode === "mobile" && (
          <div className="mx-auto mb-2 h-4 w-24 rounded-full bg-zinc-800" />
        )}

        {/* WhatsApp App Container */}
        <div className="overflow-hidden rounded-[24px] bg-[#efeae2] dark:bg-[#0b141a] text-zinc-900 dark:text-zinc-100 flex flex-col h-[560px]">
          {/* Header */}
          <div className="flex items-center gap-2 bg-[#008069] dark:bg-[#202c33] px-4 py-3 text-white shadow">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 font-bold text-xs">
              WA
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-semibold truncate leading-tight">{senderName}</div>
              <div className="text-[11px] text-emerald-100 opacity-90 truncate">
                Official Business Account
              </div>
            </div>
          </div>

          {/* Chat background wallpaper pattern and bubble */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#0000000d_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px]">
            <div className="mx-auto text-center my-1">
              <span className="rounded-md bg-white/70 dark:bg-zinc-800/80 px-2.5 py-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 shadow-sm">
                TODAY
              </span>
            </div>

            {/* Message Bubble */}
            <div className="max-w-[88%] ml-auto rounded-xl bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-50 shadow-sm overflow-hidden text-sm relative">
              {/* Banner Image Preview */}
              {activeBanner && (
                <div className="relative w-full h-44 bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <img
                    src={activeBanner}
                    alt="Template Banner"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Video Preview */}
              {mediaType === "video" && !activeBanner && (
                <div className="flex h-36 w-full items-center justify-center bg-zinc-800 text-xs text-white">
                  🎬 Video Media Attachment
                </div>
              )}

              {/* Document Preview */}
              {mediaType === "document" && !activeBanner && (
                <div className="flex items-center gap-2 p-3 bg-white/40 dark:bg-black/20 border-b border-black/5">
                  <span className="text-xl">📄</span>
                  <span className="text-xs font-medium">campaign_document.pdf</span>
                </div>
              )}

              {/* Payment QR Code Box (If payment is enabled) */}
              {isPaymentEnabled && activeQr && (
                <div className="m-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-500/30 shadow-xs flex items-center gap-3">
                  <div className="relative h-20 w-20 shrink-0 bg-white p-1 rounded-md border border-zinc-200 shadow-inner flex items-center justify-center">
                    <img
                      src={activeQr}
                      alt="Payment QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CreditCard className="h-3.5 w-3.5" />
                      Instant UPI / QR Pay
                    </div>
                    {paymentConfig?.amount && (
                      <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        ₹{Number(paymentConfig.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {paymentConfig?.upiId && (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                        UPI: {paymentConfig.upiId}
                      </div>
                    )}
                    <div className="text-[9px] text-zinc-400 mt-0.5">
                      Scan via GPay, PhonePe, Paytm
                    </div>
                  </div>
                </div>
              )}

              {/* Text Body */}
              <div className="p-3 leading-relaxed break-words text-[13px]">
                {headerText && (
                  <div className="font-bold text-[13px] text-zinc-900 dark:text-zinc-100 pb-1.5 border-b border-black/5 dark:border-white/10 mb-2">
                    {interpolate(headerText)}
                  </div>
                )}

                <div className="whitespace-pre-wrap">
                  {interpolate(bodyText) || "Preview will appear here..."}
                </div>

                {footerText && (
                  <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 opacity-80 border-t border-black/5 dark:border-white/10 pt-1.5">
                    {interpolate(footerText)}
                  </div>
                )}

                {/* WhatsApp Timestamp and Blue Ticks */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 select-none">
                  <span>10:45 AM</span>
                  <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                </div>
              </div>

              {/* Action Buttons (Direct links for payment, call phone, coupon) */}
              {buttons.length > 0 && (
                <div className="border-t border-zinc-200/40 dark:border-zinc-700/50 bg-white/40 dark:bg-black/20 divide-y divide-zinc-200/40 dark:divide-zinc-700/50">
                  {buttons.map((btn) => (
                    <div
                      key={btn.id}
                      className="py-2.5 px-3 text-center text-xs font-semibold text-[#00a884] dark:text-[#25d366] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-black/5 transition-colors"
                    >
                      {btn.type === "visit_website" && <ExternalLink className="h-3.5 w-3.5" />}
                      {btn.type === "call_phone" && <Phone className="h-3.5 w-3.5" />}
                      {btn.type === "copy_coupon" && <Copy className="h-3.5 w-3.5" />}
                      <span>{btn.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive "Choose One" Quick Reply Buttons (Meta WhatsApp Quick Replies) */}
            {choiceOptions.length > 0 && (
              <div className="max-w-[88%] ml-auto space-y-1.5 pt-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Quick Reply (Choose One)
                </div>
                <div className="flex flex-col gap-1.5">
                  {choiceOptions.map((choice, idx) => {
                    const isSelected = selectedChoice === choice;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedChoice(choice)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                          isSelected
                            ? "bg-emerald-600 text-white font-semibold ring-2 ring-emerald-400"
                            : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        <span>{choice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
