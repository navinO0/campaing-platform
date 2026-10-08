"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomers } from "@/hooks/use-dashboard-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Search,
  Upload,
  UserPlus,
  Tag,
  ShieldX,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptIn, setFilterOptIn] = useState<boolean | undefined>(undefined);
  const { data: customers = [], refetch } = useCustomers();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTags, setNewTags] = useState("");

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm)) ||
      c.tags.some((t) => t.toLowerCase().includes(searchTerm));

    const matchesOpt =
      filterOptIn === undefined
        ? true
        : filterOptIn
        ? c.optedIn && !c.optedOut
        : c.optedOut;

    return matchesSearch && matchesOpt;
  });

  const handleCreateCustomer = async () => {
    if (!newName || !newPhone) {
      toast.error("Name and Phone number are required");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail || undefined,
          tags: newTags ? newTags.split(",").map((t) => t.trim()) : [],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Failed to create customer");
        return;
      }

      toast.success("Customer added successfully!");
      setCreateModalOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewTags("");
      refetch();
    } catch {
      toast.error("Failed to connect to customers API");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Customer Directory
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage contacts, verify opt-in status, and enforce strict suppression blocklists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/customers/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by name, phone (+91...), email, or tags..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterOptIn === undefined ? "default" : "outline"}
            onClick={() => setFilterOptIn(undefined)}
          >
            All ({customers.length})
          </Button>
          <Button
            size="sm"
            variant={filterOptIn === true ? "default" : "outline"}
            onClick={() => setFilterOptIn(true)}
            className="text-emerald-600 dark:text-emerald-400"
          >
            Opted In
          </Button>
          <Button
            size="sm"
            variant={filterOptIn === false ? "default" : "outline"}
            onClick={() => setFilterOptIn(false)}
            className="text-red-600 dark:text-red-400"
          >
            Opted Out (Blocklist)
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone (Normalized)</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Compliance Status</TableHead>
              <TableHead>Last Contacted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                  No customers found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-xs">
                    <div>{c.name}</div>
                    {c.email && <div className="text-[11px] text-zinc-400">{c.email}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium">{c.phone}</TableCell>
                  <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                    {c.segment || "All Customers"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.optedOut ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Opted Out
                      </Badge>
                    ) : (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Opted In
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400 whitespace-nowrap">
                    {formatDate(c.lastContactedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Single Customer"
        description="Phone numbers are automatically normalized to E.164 international format before transmission to n8n."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer}>Save Customer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Full Name *</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">
              Phone Number (International format supported) *
            </label>
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+919876543210 or 9876543210"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Email Address</label>
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="customer@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">
              Tags (Comma separated)
            </label>
            <Input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="fashion, vip, sarees"
              className="mt-1"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
