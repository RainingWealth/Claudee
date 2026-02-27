/**
 * Voice campaign runner logic.
 * Called by /api/scheduled/voice-runner (Netlify Scheduled Function, every 1 min).
 *
 * For each running campaign:
 *  - Checks if current time is within operating hours (timezone-aware)
 *  - Counts currently active calls
 *  - Dials pending leads up to max_concurrent_calls limit
 */

import { createServiceClient } from '@/lib/supabase/server'
import { createRetellCall, normalisePhoneE164 } from '@/lib/retell'

/**
 * Check if the current UTC time falls within the campaign's operating hours.
 */
function isWithinOperatingHours(
  start: string, // "09:00"
  end: string,   // "17:00"
  timezone: string
): boolean {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const localTime = formatter.format(now) // "09:30"
    return localTime >= start && localTime < end
  } catch {
    return false
  }
}

export async function runVoiceCampaignJob(): Promise<{
  callsInitiated: number
  errors: string[]
}> {
  const supabase = await createServiceClient()
  const errors: string[] = []
  let callsInitiated = 0

  // 1. Get all running campaigns
  const { data: campaigns, error: campaignError } = await supabase
    .from('voice_campaigns')
    .select('*')
    .eq('status', 'running')

  if (campaignError) {
    return { callsInitiated: 0, errors: [`Failed to fetch campaigns: ${campaignError.message}`] }
  }

  // 2. Load DNC list (voice)
  const { data: dncList } = await supabase
    .from('do_not_contact')
    .select('phone')
    .in('channel', ['voice', 'all'])

  const dncPhones = new Set((dncList ?? []).map((d) => d.phone))

  // 3. Get Retell from_number from env
  const fromNumber = process.env.RETELL_FROM_NUMBER ?? ''

  for (const campaign of campaigns ?? []) {
    try {
      // Check operating hours
      if (
        campaign.operating_hours_start &&
        campaign.operating_hours_end &&
        !isWithinOperatingHours(
          campaign.operating_hours_start,
          campaign.operating_hours_end,
          campaign.timezone
        )
      ) {
        continue // Outside operating hours — skip this campaign
      }

      // Count currently active calls
      const { count: activeCalls } = await supabase
        .from('voice_leads')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'calling')

      const currentActive = activeCalls ?? 0
      const slots = campaign.max_concurrent_calls - currentActive
      if (slots <= 0) continue

      // Fetch next pending leads
      const { data: pendingLeads } = await supabase
        .from('voice_leads')
        .select('id, phone, name')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .limit(slots)

      for (const lead of pendingLeads ?? []) {
        if (dncPhones.has(lead.phone)) {
          await supabase
            .from('voice_leads')
            .update({ status: 'do_not_call' })
            .eq('id', lead.id)
          continue
        }

        try {
          const e164Phone = normalisePhoneE164(lead.phone)
          const callResult = await createRetellCall({
            agentId: campaign.retell_agent_id,
            fromNumber,
            toNumber: e164Phone,
            metadata: { lead_id: lead.id, campaign_id: campaign.id },
          })

          await supabase
            .from('voice_leads')
            .update({
              status: 'calling',
              retell_call_id: callResult.call_id,
              called_at: new Date().toISOString(),
            })
            .eq('id', lead.id)

          await supabase
            .from('voice_campaigns')
            .update({
              active_calls: currentActive + callsInitiated + 1,
            })
            .eq('id', campaign.id)

          callsInitiated++
        } catch (callErr) {
          errors.push(`Call failed for ${lead.phone}: ${String(callErr)}`)
          await supabase
            .from('voice_leads')
            .update({ status: 'failed' })
            .eq('id', lead.id)
          await supabase
            .from('voice_campaigns')
            .update({ failed_count: campaign.failed_count + 1 })
            .eq('id', campaign.id)
        }
      }
    } catch (err) {
      errors.push(`Campaign ${campaign.id} error: ${String(err)}`)
    }
  }

  return { callsInitiated, errors }
}
