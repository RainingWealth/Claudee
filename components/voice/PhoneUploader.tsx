'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// Install react-dropzone dynamically to avoid adding heavy dep if not needed
// Fallback: simple file input
interface PhoneUploaderProps {
  campaignId: string
  onUploaded?: (count: number) => void
}

export function PhoneUploader({ campaignId, onUploaded }: PhoneUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ inserted?: number; error?: string } | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setProgress(30)

    const formData = new FormData()
    formData.append('file', file)

    try {
      setProgress(60)
      const res = await fetch(`/api/voice/campaigns/${campaignId}/upload`, {
        method: 'POST',
        body: formData,
      })
      setProgress(90)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setResult({ inserted: data.inserted })
      onUploaded?.(data.inserted)
      toast.success(`${data.inserted} phone numbers uploaded successfully`)
    } catch (err) {
      const msg = String(err).replace('Error: ', '')
      setResult({ error: msg })
      toast.error(msg)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3 hover:border-primary/50 transition-colors">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">Upload phone number list</p>
          <p className="text-xs text-muted-foreground mt-1">
            CSV file with a &quot;phone&quot; column (and optional &quot;name&quot; column)
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" asChild>
            <span>
              <FileText className="mr-2 h-4 w-4" />
              {file ? file.name : 'Choose CSV file'}
            </span>
          </Button>
        </label>
      </div>

      {file && !result && (
        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm truncate text-muted-foreground">{file.name}</div>
          <Button size="sm" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      )}

      {uploading && <Progress value={progress} className="h-1.5" />}

      {result?.inserted !== undefined && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle2 className="h-4 w-4" />
          {result.inserted} phone numbers added
        </div>
      )}

      {result?.error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {result.error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        CSV format example:
        <code className="ml-1 bg-muted px-1 rounded">phone,name</code>
        <code className="ml-1 bg-muted px-1 rounded">6512345678,John Doe</code>
      </p>
    </div>
  )
}
