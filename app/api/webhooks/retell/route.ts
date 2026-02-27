import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyRetellSignature } from '@/lib/retell'

/**
 * Retell AI webhook handler.
 * Events: call_started, call_ended, call_analyzed
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-retell-signature') ?? ''

  const valid = await verifyRetellSignature(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload.event as string
  const callData = payload.call as Record<string, unknown> | undefined

  if (!callData) return NextResponse.json({ ok: true })

  const retellCallId = callData.call_id as string
  const callStatus = callData.call_status as string

  const supabase = await createServiceClient()

  // Find the voice_lead by retell_call_id
  const { data: lead } = await supabase
    .from('voice_leads')
    .select('*, voice_campaigns(*)')
    .eq('retell_call_id', retellCallId)
    .single()

  if (!lead) return NextResponse.json({ ok: true })

  if (event === 'call_started') {
    await supabase
      .from('voice_leads')
      .update({ status: 'calling', called_at: new Date().toISOString() })
      .eq('id', lead.id)
  }

  if (event === 'call_ended') {
    const disconnectReason = callData.disconnection_reason as string
    const durationMs = callData.duration_ms as number ?? 0

    let status: string = 'failed'
    if (disconnectReason === 'user_hangup' || disconnectReason === 'agent_hangup') {
      status = 'answered'
    } else if (disconnectReason === 'no_answer') {
      status = 'no_answer'
    } else if (disconnectReason === 'busy') {
      status = 'busy'
    }

    await supabase
      .from('voice_leads')
      .update({
        status,
        duration_seconds: Math.round(durationMs / 1000),
        call_metadata: callData,
      })
      .eq('id', lead.id)

    // Update campaign counters
    const campaign = lead.voice_campaigns as Record<string, unknown>
    if (campaign?.id) {
      const updates: Record<string, unknown> = {
        active_calls: Math.max(0, (campaign.active_calls as number ?? 1) - 1),
        called_count: (campaign.called_count as number ?? 0) + 1,
      }
      if (status === 'answered') {
        updates.answered_count = (campaign.answered_count as number ?? 0) + 1
      } else if (status === 'failed' || status === 'no_answer' || status === 'busy') {
        updates.failed_count = (campaign.failed_count as number ?? 0) + 1
      }
      await supabase.from('voice_campaigns').update(updates).eq('id', campaign.id)
    }

    // Notification
    await supabase.from('notifications').insert({
      type: status === 'answered' ? 'call_completed' : 'call_failed',
      title: status === 'answered' ? 'Call completed' : 'Call not answered',
      body: `Call to ${lead.phone} — ${status.replace('_', ' ')}`,
      metadata: { lead_id: lead.id, retell_call_id: retellCallId },
    })
  }

  if (event === 'call_analyzed') {
    const transcript = callData.transcript as string
    const recordingUrl = callData.recording_url as string

    await supabase
      .from('voice_leads')
      .update({ transcript, recording_url: recordingUrl })
      .eq('id', lead.id)
  }

  return NextResponse.json({ ok: true })
}
