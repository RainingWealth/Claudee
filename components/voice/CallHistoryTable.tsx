'use client'

import { useEffect, useState } from 'react'
import { VoiceLead, VoiceLeadStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<VoiceLeadStatus, string> = {
  pending:    'bg-gray-100 text-gray-700',
  calling:    'bg-blue-100 text-blue-700',
  answered:   'bg-green-100 text-green-700',
  no_answer:  'bg-yellow-100 text-yellow-700',
  busy:       'bg-orange-100 text-orange-700',
  failed:     'bg-red-100 text-red-700',
  do_not_call:'bg-gray-100 text-gray-500',
}

export function CallHistoryTable({ campaignId }: { campaignId: string }) {
  const [calls, setCalls] = useState<VoiceLead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<VoiceLeadStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const limit = 20

  async function loadCalls() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await fetch(`/api/voice/campaigns/${campaignId}/calls?${params}`)
    const data = await res.json()
    setCalls(data.data ?? [])
    setTotal(data.count ?? 0)
    setLoading(false)
  }

  useEffect(() => { loadCalls() }, [page, statusFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as VoiceLeadStatus | 'all'); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="calling">Calling</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="no_answer">No answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{total} total</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Called at</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recording</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
              </tr>
            ) : calls.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No calls found</td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr key={call.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{call.phone}</td>
                  <td className="px-4 py-3">{call.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${statusColors[call.status]}`}>
                      {call.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {call.called_at ? format(new Date(call.called_at), 'dd MMM, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {call.duration_seconds != null
                      ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {call.recording_url ? (
                      <a
                        href={call.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        Listen <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
