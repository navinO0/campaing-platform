"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  FileText,
  Users,
  Upload,
  Layers,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [campaignsOpen, setCampaignsOpen] = useState(true);
  const [customersOpen, setCustomersOpen] = useState(true);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-emerald-600 dark:text-emerald-500">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm">
            WA
          </div>
          <span>Campaign Pro</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Overview
          </div>
          <div className="mt-2 space-y-1">
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/dashboard")
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Campaigns section */}
        <div>
          <button
            onClick={() => setCampaignsOpen(!campaignsOpen)}
            className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <span>Campaigns</span>
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", campaignsOpen ? "rotate-0" : "-rotate-90")}
            />
          </button>
          {campaignsOpen && (
            <div className="mt-2 space-y-1">
              <Link
                href="/campaigns"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/campaigns")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Megaphone className="h-4 w-4" />
                All Campaigns
              </Link>
              <Link
                href="/campaigns/create"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/campaigns/create")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <PlusCircle className="h-4 w-4" />
                Create Campaign
              </Link>
              <Link
                href="/templates"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/templates")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <FileText className="h-4 w-4" />
                Templates
              </Link>
            </div>
          )}
        </div>

        {/* Customers section */}
        <div>
          <button
            onClick={() => setCustomersOpen(!customersOpen)}
            className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <span>Customers</span>
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", customersOpen ? "rotate-0" : "-rotate-90")}
            />
          </button>
          {customersOpen && (
            <div className="mt-2 space-y-1">
              <Link
                href="/customers"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/customers")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Users className="h-4 w-4" />
                Customers
              </Link>
              <Link
                href="/customers/import"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/customers/import")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Upload className="h-4 w-4" />
                Import Customers
              </Link>
              <Link
                href="/segments"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/segments")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Layers className="h-4 w-4" />
                Segments
              </Link>
            </div>
          )}
        </div>

        {/* Management & Analytics */}
        <div>
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Insights & Setup
          </div>
          <div className="mt-2 space-y-1">
            <Link
              href="/analytics"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/analytics")
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
            <Link
              href="/settings"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/settings")
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Footer / Status */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">n8n Engine Active</div>
            <div className="text-zinc-500 dark:text-zinc-400">Safe Proxy Mode</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
