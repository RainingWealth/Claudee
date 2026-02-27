'use client'

import { useEffect, useState } from 'react'
import { VoiceCampaign } from '@/types'
import { CampaignCard } from '@/components/voice/CampaignCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Phone, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function VoicePage() {
  const [campaigns, setCampaigns] = useState<VoiceCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    retell_agent_id: '',
    operating_hours_start: '09:00',
    operating_hours_end: '17:00',
    timezone: 'Asia/Singapore',
    max_concurrent_calls: 3,
  })

  async function loadCampaigns() {
    const res = await fetch('/api/voice/campaigns')
    const data = await res.json()
    setCampaigns(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadCampaigns() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/voice/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const newCampaign = await res.json()
      setCampaigns((prev) => [newCampaign, ...prev])
      setOpen(false)
      setForm({ name: '', retell_agent_id: '', operating_hours_start: '09:00', operating_hours_end: '17:00', timezone: 'Asia/Singapore', max_concurrent_calls: 3 })
      toast.success('Campaign created')
    } catch (err) {
      toast.error(String(err).replace('Error: ', ''))
    } finally {
      setCreating(false)
    }
  }

  function updateCampaign(updated: VoiceCampaign) {
    setCampaigns((prev) => prev.map((c) => c.id === updated.id ? updated : c))
  }

  const totalActive = campaigns.filter((c) => c.status === 'running').length
  const totalActiveCalls = campaigns.reduce((s, c) => s + c.active_calls, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Voice AI Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              {totalActive} running · {totalActiveCalls} active calls now
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create voice campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign name</Label>
                <Input
                  placeholder="e.g. Facebook Leads Feb 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Retell AI Agent ID</Label>
                <Input
                  placeholder="agent_xxx..."
                  value={form.retell_agent_id}
                  onChange={(e) => setForm({ ...form, retell_agent_id: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={form.operating_hours_start}
                    onChange={(e) => setForm({ ...form, operating_hours_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={form.operating_hours_end}
                    onChange={(e) => setForm({ ...form, operating_hours_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  placeholder="e.g. Asia/Singapore"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max concurrent calls (1–10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.max_concurrent_calls}
                  onChange={(e) => setForm({ ...form, max_concurrent_calls: Number(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign grid */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first voice campaign to start calling leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} onUpdate={updateCampaign} />
          ))}
        </div>
      )}
    </div>
  )
}
