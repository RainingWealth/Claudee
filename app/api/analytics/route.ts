import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalContacts },
    { count: botActiveContacts },
    { count: messagesToday },
    { count: responsesTotal },
    { count: contactsTotal },
    { data: contactsByStatus },
    { count: totalCampaigns },
    { count: activeCampaigns },
    { count: callsToday },
    { count: answeredToday },
    { data: activeCalls },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('bot_enabled', true),
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()).eq('direction', 'outbound'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).not('last_response_at', 'is', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).neq('status', 'new'),
    supabase.from('contacts').select('status'),
    supabase.from('voice_campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('voice_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('voice_leads').select('*', { count: 'exact', head: true }).gte('called_at', today.toISOString()),
    supabase.from('voice_leads').select('*', { count: 'exact', head: true }).gte('called_at', today.toISOString()).eq('status', 'answered'),
    supabase.from('voice_campaigns').select('active_calls').eq('status', 'running'),
  ])

  // Aggregate contacts by status
  const statusCounts: Record<string, number> = {
    new: 0, contacted: 0, responded: 0, qualified: 0, closed: 0,
  }
  for (const c of contactsByStatus ?? []) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1
  }

  const totalActiveCallsNow = (activeCalls ?? []).reduce(
    (sum, c) => sum + (c.active_calls ?? 0),
    0
  )

  const responseRate = (contactsTotal ?? 0) > 0
    ? Math.round(((responsesTotal ?? 0) / (contactsTotal ?? 1)) * 100)
    : 0

  const answerRate = (callsToday ?? 0) > 0
    ? Math.round(((answeredToday ?? 0) / (callsToday ?? 1)) * 100)
    : 0

  return NextResponse.json({
    whatsapp: {
      total_contacts: totalContacts ?? 0,
      bot_active_contacts: botActiveContacts ?? 0,
      messages_sent_today: messagesToday ?? 0,
      response_rate: responseRate,
      contacts_by_status: statusCounts,
    },
    voice: {
      total_campaigns: totalCampaigns ?? 0,
      active_campaigns: activeCampaigns ?? 0,
      calls_today: callsToday ?? 0,
      answer_rate: answerRate,
      active_calls_now: totalActiveCallsNow,
    },
  })
}
