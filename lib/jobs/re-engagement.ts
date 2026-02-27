/**
 * Re-engagement job logic.
 * Called by /api/scheduled/re-engagement (Netlify Scheduled Function, every 30 min).
 *
 * Finds contacts where:
 *  - bot_enabled = true
 *  - next_engagement_at <= now()
 *  - phone NOT in do_not_contact
 * And sends a re-engagement WhatsApp message using the configured template.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage, renderTemplate } from '@/lib/ultramsg'

export async function runReEngagementJob(): Promise<{
  processed: number
  errors: string[]
}> {
  const supabase = await createServiceClient()
  const errors: string[] = []
  let processed = 0

  // 1. Get the re-engagement template ID from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('reengagement_template_id, default_re_engagement_days')
    .single()

  if (!settings?.reengagement_template_id) {
    return { processed: 0, errors: ['No re-engagement template configured in settings.'] }
  }

  const { data: template } = await supabase
    .from('message_templates')
    .select('content')
    .eq('id', settings.reengagement_template_id)
    .single()

  if (!template) {
    return { processed: 0, errors: ['Re-engagement template not found.'] }
  }

  // 2. Fetch contacts due for re-engagement
  const now = new Date().toISOString()
  const { data: dncList } = await supabase
    .from('do_not_contact')
    .select('phone')
    .in('channel', ['whatsapp', 'all'])

  const dncPhones = new Set((dncList ?? []).map((d) => d.phone))

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, phone, name')
    .eq('bot_enabled', true)
    .lte('next_engagement_at', now)
    .not('next_engagement_at', 'is', null)

  if (error) {
    return { processed: 0, errors: [`DB query failed: ${error.message}`] }
  }

  for (const contact of contacts ?? []) {
    if (dncPhones.has(contact.phone)) continue

    try {
      const messageBody = renderTemplate(template.content, {
        name: contact.name ?? 'there',
      })

      await sendWhatsAppMessage({ to: contact.phone, body: messageBody })

      // Calculate next engagement date
      const intervalDays = settings.default_re_engagement_days ?? 2
      const nextEngagement = new Date()
      nextEngagement.setDate(nextEngagement.getDate() + intervalDays)

      await supabase
        .from('contacts')
        .update({
          last_message_at: now,
          next_engagement_at: nextEngagement.toISOString(),
        })
        .eq('id', contact.id)

      // Log message in messages table
      await supabase.from('messages').insert({
        contact_id: contact.id,
        direction: 'outbound',
        content: messageBody,
        message_type: 'template',
        status: 'sent',
        sent_by: 'bot',
      })

      // Create notification
      await supabase.from('notifications').insert({
        type: 'reengagement_sent',
        title: 'Re-engagement sent',
        body: `Sent re-engagement message to ${contact.name ?? contact.phone}`,
        metadata: { contact_id: contact.id },
      })

      processed++
    } catch (err) {
      errors.push(`Failed for ${contact.phone}: ${String(err)}`)
    }
  }

  return { processed, errors }
}
