"use client";

import { useRef, useState } from "react";
import { uploadCsv } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface CsvUploaderProps {
  onSuccess?: (result: { fund_id: number; fund_name: string; rows_imported: number }) => void;
}

export function CsvUploader({ onSuccess }: CsvUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fundName, setFundName] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !fundName) setFundName(f.name.replace(/\.csv$/i, ""));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !fundName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await uploadCsv(file, fundName.trim(), internalCode.trim() || undefined);
      setSuccess(`Imported ${result.rows_imported} rows for "${result.fund_name}" (Fund ID: ${result.fund_id}).`);
      onSuccess?.(result);
      setFile(null);
      setFundName("");
      setInternalCode("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CSV File <span className="text-red-500">*</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-gray-400 mt-1">
          Required columns: <code>date</code> and <code>nav</code>. Supports YYYY-MM-DD, DD/MM/YYYY formats.{" "}
          <a href="/api/v1/upload/template" className="text-blue-600 hover:underline">Download template</a>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fund Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={fundName}
          onChange={(e) => setFundName(e.target.value)}
          placeholder="e.g. My Private Fund"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Internal Code <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={internalCode}
          onChange={(e) => setInternalCode(e.target.value)}
          placeholder="e.g. FUND_ABC or MY_FUND_001"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <Button type="submit" disabled={!file || !fundName.trim() || loading}>
        {loading ? "Uploading..." : "Upload NAV History"}
      </Button>
    </form>
  );
}
