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
  Search,
  Upload,
  UserPlus,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  Edit2,
  Tag,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptIn, setFilterOptIn] = useState<boolean | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    customers = [],
    refetch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    bulkTag,
    bulkOptOut,
  } = useCustomers();

  // Create Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTags, setNewTags] = useState("");

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editOptedIn, setEditOptedIn] = useState(true);

  // Bulk Tag Modal state
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState("");

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newName || !newPhone) {
      toast.error("Name and Phone number are required");
      return;
    }

    try {
      await createCustomer({
        name: newName,
        phone: newPhone,
        email: newEmail || undefined,
        tags: newTags ? newTags.split(",").map((t) => t.trim()) : [],
      });
      setCreateModalOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewTags("");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditEmail(customer.email || "");
    setEditTags(customer.tags.join(", "));
    setEditOptedIn(customer.optedIn && !customer.optedOut);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    try {
      await updateCustomer({
        id: editingCustomer.id,
        data: {
          name: editName,
          phone: editPhone,
          email: editEmail || undefined,
          tags: editTags ? editTags.split(",").map((t) => t.trim()) : [],
          optedIn: editOptedIn,
          optedOut: !editOptedIn,
        },
      });
      setEditModalOpen(false);
      setEditingCustomer(null);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"?`)) {
      await deleteCustomer(id);
    }
  };

  const handleApplyBulkTag = async () => {
    if (!bulkTagInput.trim()) return;
    await bulkTag({ customerIds: selectedIds, tag: bulkTagInput.trim() });
    setBulkTagModalOpen(false);
    setBulkTagInput("");
    setSelectedIds([]);
  };

  const handleApplyBulkOptOut = async () => {
    if (confirm(`Add ${selectedIds.length} selected customers to the suppression blocklist?`)) {
      await bulkOptOut({ customerIds: selectedIds, reason: "Manual Bulk Admin Suppression" });
      setSelectedIds([]);
    }
  };

  const handleExportCSV = () => {
    window.open("/api/customers/export", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Customer Directory
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Complete CRUD operations, bulk selection, tagging, opt-out suppression, and CSV export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
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

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            {selectedIds.length} customers selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkTagModalOpen(true)}
              className="h-8 text-xs gap-1"
            >
              <Tag className="h-3.5 w-3.5" />
              Bulk Tag
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleApplyBulkOptOut}
              className="h-8 text-xs gap-1"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Bulk Opt-Out
            </Button>
          </div>
        </div>
      )}

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
              <TableHead className="w-12 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-zinc-300"
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone (Normalized)</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Compliance Status</TableHead>
              <TableHead>Last Contacted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                  No customers found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => handleToggleSelect(c.id)}
                      className="rounded border-zinc-300"
                    />
                  </TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Customer"
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                        title="Delete Customer"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Modal */}
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Customer Details"
        description="Modify contact information and opt-in compliance state."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Update Customer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Full Name *</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Phone Number *</label>
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Email Address</label>
            <Input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">
              Tags (Comma separated)
            </label>
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={editOptedIn}
                onChange={(e) => setEditOptedIn(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>Opted In (Eligible for promotional messages)</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Bulk Tag Modal */}
      <Modal
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        title="Bulk Add Tag"
        description={`Add a tag to ${selectedIds.length} selected customers.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkTagModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyBulkTag}>Apply Tag</Button>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold uppercase text-zinc-500">Tag Name *</label>
          <Input
            value={bulkTagInput}
            onChange={(e) => setBulkTagInput(e.target.value)}
            placeholder="e.g. diwali-campaign-target"
            className="mt-1"
          />
        </div>
      </Modal>
    </div>
  );
}
