'use client'

import Link from 'next/link'
import { VoiceCampaign } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Play, Pause, Phone, PhoneCall, PhoneOff, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

const statusColors = {
  draft:     'bg-gray-100 text-gray-700',
  running:   'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

interface CampaignCardProps {
  campaign: VoiceCampaign
  onUpdate: (c: VoiceCampaign) => void
}

export function CampaignCard({ campaign, onUpdate }: CampaignCardProps) {
  const [loading, setLoading] = useState(false)

  const progress = campaign.total_numbers > 0
    ? Math.round((campaign.called_count / campaign.total_numbers) * 100)
    : 0

  const answerRate = campaign.called_count > 0
    ? Math.round((campaign.answered_count / campaign.called_count) * 100)
    : 0

  async function handleAction(action: 'start' | 'pause') {
    setLoading(true)
    try {
      const res = await fetch(`/api/voice/campaigns/${campaign.id}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed')
      const updated = await res.json()
      onUpdate(updated)
      toast.success(`Campaign ${action === 'start' ? 'started' : 'paused'}`)
    } catch {
      toast.error(`Failed to ${action} campaign`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/voice/${campaign.id}`}>
              <h3 className="font-semibold truncate hover:underline">{campaign.name}</h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaign.operating_hours_start && campaign.operating_hours_end
                ? `${campaign.operating_hours_start} – ${campaign.operating_hours_end} ${campaign.timezone}`
                : 'No operating hours set'}
            </p>
          </div>
          <Badge className={`text-xs shrink-0 ${statusColors[campaign.status]}`} variant="outline">
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <Stat icon={Phone} label="Total" value={campaign.total_numbers} />
          <Stat icon={PhoneCall} label="Answered" value={campaign.answered_count} color="text-green-600" />
          <Stat icon={PhoneOff} label="Failed" value={campaign.failed_count} color="text-red-500" />
          <Stat icon={Clock} label="Active" value={campaign.active_calls} color="text-blue-600" />
        </div>

        {/* Progress */}
        {campaign.total_numbers > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{campaign.called_count} / {campaign.total_numbers} called</span>
              <span>{answerRate}% answer rate</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Concurrent calls */}
        <p className="text-xs text-muted-foreground">
          Max {campaign.max_concurrent_calls} concurrent calls
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          {campaign.status === 'running' ? (
            <Button size="sm" variant="outline" onClick={() => handleAction('pause')} disabled={loading}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : campaign.status !== 'completed' ? (
            <Button size="sm" onClick={() => handleAction('start')} disabled={loading}>
              <Play className="mr-2 h-4 w-4" />
              {campaign.status === 'paused' ? 'Resume' : 'Start'}
            </Button>
          ) : null}
          <Link href={`/voice/${campaign.id}`}>
            <Button size="sm" variant="ghost">View details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  color = 'text-foreground',
}: {
  icon: React.ElementType
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
