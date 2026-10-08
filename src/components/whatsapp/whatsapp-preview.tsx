"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Smartphone, Monitor, CheckCheck, ExternalLink, Phone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaType, TemplateButton } from "@/types";

interface WhatsAppPreviewProps {
  bodyText: string;
  variables?: Record<string, string>;
  mediaType?: MediaType;
  mediaUrl?: string;
  buttons?: TemplateButton[];
  senderName?: string;
}

export function WhatsAppPreview({
  bodyText,
  variables = {},
  mediaType = "none",
  mediaUrl,
  buttons = [],
  senderName = "Brand Promotional Bot",
}: WhatsAppPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "desktop">("mobile");

  // Interpolate variable placeholders like {{customer_name}}
  const renderMessageContent = () => {
    let replaced = bodyText || "";
    Object.entries(variables).forEach(([k, v]) => {
      const reg = new RegExp(`\\{\\{${k}\\}\\}`, "g");
      replaced = replaced.replace(reg, v || `[${k}]`);
    });
    return replaced;
  };

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
            ? "w-[340px] rounded-[36px] border-8 border-zinc-800 bg-zinc-950 p-2 shadow-2xl relative"
            : "w-full max-w-lg rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-900 p-3 shadow-xl"
        }
      >
        {/* Mobile Camera notch */}
        {deviceMode === "mobile" && (
          <div className="mx-auto mb-2 h-4 w-24 rounded-full bg-zinc-800" />
        )}

        {/* WhatsApp App Container */}
        <div className="overflow-hidden rounded-[24px] bg-[#efeae2] dark:bg-[#0b141a] text-zinc-900 dark:text-zinc-100 flex flex-col h-[520px]">
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
            <div className="max-w-[85%] ml-auto rounded-xl bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-50 shadow-sm overflow-hidden text-sm relative">
              {/* Media Preview */}
              {mediaType === "image" && mediaUrl && (
                <div className="relative w-full h-44 bg-zinc-200 dark:bg-zinc-800">
                  <img
                    src={mediaUrl}
                    alt="Campaign Media"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {mediaType === "video" && (
                <div className="flex h-36 w-full items-center justify-center bg-zinc-800 text-xs text-white">
                  🎬 Video Media Attachment
                </div>
              )}

              {mediaType === "document" && (
                <div className="flex items-center gap-2 p-3 bg-white/40 dark:bg-black/20 border-b border-black/5">
                  <span className="text-xl">📄</span>
                  <span className="text-xs font-medium">campaign_document.pdf</span>
                </div>
              )}

              {/* Text Body */}
              <div className="p-3 whitespace-pre-wrap leading-relaxed break-words text-[13px]">
                {renderMessageContent() || "Preview will appear here..."}

                {/* WhatsApp Timestamp and Blue Ticks */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 select-none">
                  <span>10:45 AM</span>
                  <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                </div>
              </div>

              {/* CTA Buttons */}
              {buttons.length > 0 && (
                <div className="border-t border-zinc-200/40 dark:border-zinc-700/50 bg-white/30 dark:bg-black/10 divide-y divide-zinc-200/40 dark:divide-zinc-700/50">
                  {buttons.map((btn) => (
                    <div
                      key={btn.id}
                      className="py-2.5 px-3 text-center text-xs font-semibold text-[#00a884] dark:text-[#00a884] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-black/5 transition-colors"
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
          </div>
        </div>
      </div>
    </div>
  );
}
