import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ActiveCallsMonitor } from '@/components/voice/ActiveCallsMonitor'
import { CallHistoryTable } from '@/components/voice/CallHistoryTable'
import { PhoneUploader } from '@/components/voice/PhoneUploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Phone, PhoneCall, PhoneOff, Clock } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ campaignId: string }>
}

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('voice_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) notFound()

  const progress = campaign.total_numbers > 0
    ? Math.round((campaign.called_count / campaign.total_numbers) * 100)
    : 0

  const answerRate = campaign.called_count > 0
    ? Math.round((campaign.answered_count / campaign.called_count) * 100)
    : 0

  const statusColors: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    running:   'bg-green-100 text-green-700',
    paused:    'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/voice">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant="outline" className={`${statusColors[campaign.status]}`}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.operating_hours_start} – {campaign.operating_hours_end} · {campaign.timezone} · Max {campaign.max_concurrent_calls} concurrent
          </p>
        </div>
      </div>

      {/* Stats + Active calls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Call stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <StatBox label="Total" value={campaign.total_numbers} icon={Phone} />
              <StatBox label="Called" value={campaign.called_count} icon={PhoneCall} color="text-blue-600" />
              <StatBox label="Answered" value={campaign.answered_count} icon={PhoneCall} color="text-green-600" />
              <StatBox label="Failed" value={campaign.failed_count} icon={PhoneOff} color="text-red-500" />
            </div>
            {campaign.total_numbers > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress}% complete</span>
                  <span>{answerRate}% answer rate</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active calls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live calls</CardTitle>
          </CardHeader>
          <CardContent>
            <ActiveCallsMonitor
              campaignId={campaignId}
              initialActiveCalls={campaign.active_calls}
            />
          </CardContent>
        </Card>
      </div>

      {/* Upload + Call history */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload phone list</CardTitle>
          </CardHeader>
          <CardContent>
            <PhoneUploader campaignId={campaignId} />
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Call history</CardTitle>
            </CardHeader>
            <CardContent>
              <CallHistoryTable campaignId={campaignId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  icon: Icon,
  color = 'text-foreground',
}: {
  label: string
  value: number
  icon: React.ElementType
  color?: string
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
