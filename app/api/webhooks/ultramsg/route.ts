import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage, renderTemplate } from '@/lib/ultramsg'

/**
 * UltraMSG incoming webhook.
 * UltraMSG sends a POST to this URL when a message is received on your instance.
 * Payload shape: https://docs.ultramsg.com/api/webhooks
 */
export async function POST(req: NextRequest) {
  const body = await req.json()

  // UltraMSG webhook payload
  const { data: msgData, eventType } = body

  // We only care about incoming messages
  if (eventType !== 'message_received' && msgData?.from_me) {
    return NextResponse.json({ ok: true })
  }

  const from: string = msgData?.from ?? ''        // "6512345678@c.us"
  const messageBody: string = msgData?.body ?? ''
  const msgId: string = msgData?.id ?? ''

  if (!from || !messageBody) {
    return NextResponse.json({ ok: true })
  }

  // Normalise phone: strip @c.us suffix
  const phone = from.replace(/@c\.us$/, '')

  const supabase = await createServiceClient()

  // 1. Find or create contact
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({ phone, source: 'manual', status: 'new' })
      .select()
      .single()
    contact = newContact
  }

  if (!contact) {
    return NextResponse.json({ error: 'Failed to find/create contact' }, { status: 500 })
  }

  // 2. Save incoming message
  await supabase.from('messages').insert({
    contact_id: contact.id,
    direction: 'inbound',
    content: messageBody,
    message_type: 'text',
    ultramsg_message_id: msgId,
    status: 'delivered',
    sent_by: 'human',
  })

  const now = new Date().toISOString()

  // 3. Update contact: mark responded, reset next_engagement_at
  await supabase
    .from('contacts')
    .update({
      last_response_at: now,
      last_message_at: now,
      status: contact.status === 'new' || contact.status === 'contacted' ? 'responded' : contact.status,
      // Push next_engagement_at out by their interval (reset the clock)
      next_engagement_at: (() => {
        const d = new Date()
        d.setDate(d.getDate() + (contact?.re_engagement_interval_days ?? 2))
        return d.toISOString()
      })(),
      // Auto-score: +10 for responding
      lead_score: Math.min(100, (contact.lead_score ?? 0) + 10),
    })
    .eq('id', contact.id)

  // 4. Auto-add to DNC if they opt out
  const optOutKeywords = ['stop', 'unsubscribe', 'remove me', 'opt out', 'do not contact']
  if (optOutKeywords.some((kw) => messageBody.toLowerCase().includes(kw))) {
    await supabase
      .from('do_not_contact')
      .upsert({ phone, channel: 'whatsapp', reason: 'Customer opt-out via WhatsApp' })
    await supabase
      .from('contacts')
      .update({ bot_enabled: false })
      .eq('id', contact.id)
  }

  // 5. Create notification for new inbound message
  await supabase.from('notifications').insert({
    type: 'new_message',
    title: 'New WhatsApp message',
    body: `${contact.name ?? phone}: "${messageBody.slice(0, 60)}${messageBody.length > 60 ? '...' : ''}"`,
    metadata: { contact_id: contact.id, message_id: msgId },
  })

  // 6. If bot is enabled and this is first response, send auto-reply
  //    (handled by re-engagement scheduler; no immediate bot response here unless a flow is set up)

  return NextResponse.json({ ok: true })
}
