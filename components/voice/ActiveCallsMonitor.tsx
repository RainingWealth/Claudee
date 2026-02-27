'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VoiceCampaign } from '@/types'
import { Badge } from '@/components/ui/badge'
import { PhoneCall, Loader2 } from 'lucide-react'

interface ActiveCallsMonitorProps {
  campaignId: string
  initialActiveCalls: number
}

export function ActiveCallsMonitor({ campaignId, initialActiveCalls }: ActiveCallsMonitorProps) {
  const supabase = createClient()
  const [activeCalls, setActiveCalls] = useState(initialActiveCalls)
  const [calling, setCalling] = useState<string[]>([])

  useEffect(() => {
    // Subscribe to voice_leads changes for this campaign
    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_leads',
          filter: `campaign_id=eq.${campaignId}`,
        },
        async () => {
          // Refresh active calls count
          const { count } = await supabase
            .from('voice_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('status', 'calling')
          setActiveCalls(count ?? 0)

          // Fetch calling numbers
          const { data } = await supabase
            .from('voice_leads')
            .select('phone')
            .eq('campaign_id', campaignId)
            .eq('status', 'calling')
          setCalling((data ?? []).map((l) => l.phone))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          {activeCalls > 0 && (
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
          )}
          <div className={`relative w-3 h-3 rounded-full ${activeCalls > 0 ? 'bg-green-500' : 'bg-muted'}`} />
        </div>
        <span className="font-semibold text-2xl">{activeCalls}</span>
        <span className="text-muted-foreground text-sm">active call{activeCalls !== 1 ? 's' : ''}</span>
      </div>

      {calling.length > 0 && (
        <div className="space-y-1">
          {calling.map((phone) => (
            <div key={phone} className="flex items-center gap-2 text-sm">
              <PhoneCall className="h-3.5 w-3.5 text-green-600 animate-pulse" />
              <span className="font-mono text-xs">{phone}</span>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">calling</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
