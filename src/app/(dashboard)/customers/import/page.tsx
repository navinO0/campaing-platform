"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { normalizePhoneNumber } from "@/lib/validation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CustomerCsvImportPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  // Column Mapping
  const [mapping, setMapping] = useState({
    name: "",
    phone: "",
    email: "",
    countryCode: "",
    tags: "",
    optedIn: "",
    segment: "",
  });

  // Validation results
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  const [suppressedOptOut, setSuppressedOptOut] = useState<any[]>([]);

  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
        const cols = Object.keys(results.data[0] || {});
        setColumns(cols);

        // Auto-detect columns
        setMapping({
          name: cols.find((c) => /name/i.test(c)) || cols[0] || "",
          phone: cols.find((c) => /phone|mobile|whatsapp/i.test(c)) || cols[1] || "",
          email: cols.find((c) => /email/i.test(c)) || "",
          countryCode: cols.find((c) => /country/i.test(c)) || "",
          tags: cols.find((c) => /tag/i.test(c)) || "",
          optedIn: cols.find((c) => /opt/i.test(c)) || "",
          segment: cols.find((c) => /segment/i.test(c)) || "",
        });

        setStep(2);
      },
    });
  };

  const handleRunValidation = () => {
    if (!mapping.name || !mapping.phone) {
      toast.error("Please map both Name and Phone columns");
      return;
    }

    const valids: any[] = [];
    const invalids: any[] = [];
    const suppressed: any[] = [];

    parsedData.forEach((row, idx) => {
      const nameVal = row[mapping.name];
      const phoneVal = row[mapping.phone];
      const optVal = mapping.optedIn ? row[mapping.optedIn] : undefined;

      // Check opt out
      const isExplicitOptOut =
        optVal === false || optVal === "false" || optVal === "0" || optVal === "no";
      if (isExplicitOptOut) {
        suppressed.push({ ...row, reason: "Suppressed: Opted-Out customer" });
        return;
      }

      if (!nameVal || !phoneVal) {
        invalids.push({ ...row, reason: "Missing Name or Phone" });
        return;
      }

      const { isValid, normalized, error } = normalizePhoneNumber(
        String(phoneVal),
        mapping.countryCode ? String(row[mapping.countryCode]) : "91"
      );

      if (!isValid) {
        invalids.push({ ...row, reason: error || "Invalid Phone Format" });
      } else {
        valids.push({
          name: nameVal,
          phone: normalized,
          email: mapping.email ? row[mapping.email] : undefined,
          tags: mapping.tags ? row[mapping.tags] : undefined,
          segment: mapping.segment ? row[mapping.segment] : "CSV Import",
          optedIn: true,
        });
      }
    });

    setValidRows(valids);
    setInvalidRows(invalids);
    setSuppressedOptOut(suppressed);
    setStep(3);
  };

  const handleExecuteImport = async () => {
    setIsImporting(true);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Import failed");
        return;
      }
      setImportResult(json.data);
      setStep(6);
      toast.success("Customers imported and forwarded to n8n!");
    } catch {
      toast.error("Network error during import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadInvalid = () => {
    const csv = Papa.unparse(invalidRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "invalid_rows.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          CSV Customer Import Wizard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          6-step compliant import pipeline with E.164 normalization & suppression filtering.
        </p>
      </div>

      {/* Stepper tracker */}
      <div className="flex items-center justify-between overflow-x-auto py-2 border-b border-zinc-200 dark:border-zinc-800">
        {["1. Upload", "2. Map Columns", "3. Validate", "4. Preview", "5. Import", "6. Result"].map(
          (title, idx) => {
            const num = idx + 1;
            return (
              <div
                key={title}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                  step === num
                    ? "bg-emerald-600 text-white"
                    : step > num
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400"
                }`}
              >
                {title}
              </div>
            );
          }
        )}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Customer CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <Upload className="h-10 w-10 text-emerald-600 mb-3" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Supported columns: name, phone, email, countryCode, tags, segment, optedIn
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">Name Column *</label>
                <select
                  value={mapping.name}
                  onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <option value="">Select column...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">Phone Column *</label>
                <select
                  value={mapping.phone}
                  onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <option value="">Select column...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">Email Column</label>
                <select
                  value={mapping.email}
                  onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <option value="">(Optional)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">Tags Column</label>
                <select
                  value={mapping.tags}
                  onChange={(e) => setMapping({ ...mapping, tags: e.target.value })}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <option value="">(Optional)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleRunValidation} className="gap-1.5">
                Validate Rows
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Validate */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase">
                  Valid Rows
                </div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  {validRows.length}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-center">
                <div className="text-xs font-semibold text-red-800 dark:text-red-400 uppercase">
                  Invalid Rows
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                  {invalidRows.length}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase">
                  Opt-Out Suppressed
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                  {suppressedOptOut.length}
                </div>
              </div>
            </div>

            {invalidRows.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {invalidRows.length} rows have missing or malformed phone numbers.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadInvalid}
                  className="gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Invalid Rows
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="gap-1.5">
                Preview Valid Rows
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Customers to Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Normalized Phone</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-600">{r.phone}</TableCell>
                      <TableCell className="text-xs text-zinc-400">{r.tags || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={() => setStep(5)} className="gap-1.5">
                Proceed to Import
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Import Confirmation */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Import to n8n Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                You are about to securely import{" "}
                <strong>{validRows.length} verified customers</strong>. These records will be sent
                to the n8n contact processor webhook.
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button
                disabled={isImporting}
                onClick={handleExecuteImport}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                {isImporting ? "Importing..." : "Execute Import"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Result */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-600 flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Import Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {importResult?.validCount} customer records have been saved and dispatched to the n8n
              workflow for contact enrichment and deduplication.
            </p>
            <div className="flex gap-3">
              <Link href="/customers">
                <Button>Go to Customers Directory</Button>
              </Link>
              <Link href="/campaigns/create">
                <Button variant="outline">Launch Campaign</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
