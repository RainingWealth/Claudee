'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ReEngagementSettingsProps {
  contactId: string
  currentInterval: number
  onSave?: (days: number) => void
}

export function ReEngagementSettings({
  contactId,
  currentInterval,
  onSave,
}: ReEngagementSettingsProps) {
  const [days, setDays] = useState(currentInterval)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/whatsapp/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ re_engagement_interval_days: days }),
      })
      if (!res.ok) throw new Error('Failed')
      onSave?.(days)
      toast.success(`Re-engagement interval updated to every ${days} day(s)`)
    } catch {
      toast.error('Failed to update re-engagement settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Re-engagement</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Send a follow-up message if the prospect doesn&apos;t respond within this many days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="interval" className="text-sm whitespace-nowrap">Every</Label>
          <Input
            id="interval"
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-20"
          />
          <Label className="text-sm">day(s)</Label>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
