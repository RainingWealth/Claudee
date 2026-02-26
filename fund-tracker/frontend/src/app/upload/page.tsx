"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CsvUploader } from "@/components/upload/CsvUploader";

export default function UploadPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Upload NAV History</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Fund NAV History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import price history for private or unlisted funds that aren't available via Yahoo Finance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Upload CSV File</h2>
        </CardHeader>
        <CardBody>
          <CsvUploader
            onSuccess={(result) => {
              router.push(`/fund/${result.fund_id}`);
            }}
          />
        </CardBody>
      </Card>

      {/* CSV format guide */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">CSV Format Requirements</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-gray-600">
          <p>Your CSV must contain at least two columns:</p>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs">
            <div className="text-gray-400 mb-1">Required headers:</div>
            date,nav<br />
            2024-01-02,100.00<br />
            2024-01-03,100.50<br />
            2024-01-04,99.75
          </div>
          <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside">
            <li>Supported date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY</li>
            <li>NAV values must be positive numbers</li>
            <li>UTF-8 or UTF-8-with-BOM encoding (Excel exports work)</li>
            <li>Maximum file size: 10 MB</li>
            <li>Missing trading days are handled gracefully with warnings</li>
          </ul>
          <a
            href="/api/v1/upload/template"
            className="inline-block text-xs text-blue-600 hover:underline mt-1"
          >
            ↓ Download blank CSV template
          </a>
        </CardBody>
      </Card>

      {/* Demo CSV */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Demo Sample CSV</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-600 mb-3">
            Want to test the upload feature? Use our pre-generated sample CSV with 6 years of
            synthetic NAV data (2019–2024).
          </p>
          <a
            href="/demo/sample_nav.csv"
            download="sample_nav.csv"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ↓ Download sample_nav.csv
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
