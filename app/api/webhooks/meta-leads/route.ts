import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchMetaLead, parseMetaLead, verifyMetaSignature } from '@/lib/meta-api'
import { sendWhatsAppMessage, renderTemplate } from '@/lib/ultramsg'

/**
 * Meta Lead Ads webhook.
 *
 * GET  — Hub verification (subscribe this endpoint in Meta App Dashboard)
 * POST — Incoming lead event
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''

  // Verify Meta signature
  const valid = await verifyMetaSignature(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Parse lead events
  const entries = (payload.entry as Array<{ changes?: unknown[] }>) ?? []
  for (const entry of entries) {
    const changes = (entry.changes as Array<{ field?: string; value?: Record<string, unknown> }>) ?? []
    for (const change of changes) {
      if (change.field !== 'leadgen') continue

      const value = change.value ?? {}
      const leadgenId = value.leadgen_id as string
      const pageId = value.page_id as string

      if (!leadgenId) continue

      try {
        // Fetch full lead from Graph API
        const leadData = await fetchMetaLead(leadgenId)
        const { phone, name, email } = parseMetaLead(leadData)

        if (!phone) continue // Can't contact without phone

        // Upsert contact
        const { data: contact } = await supabase
          .from('contacts')
          .upsert(
            {
              phone,
              name,
              email,
              source: 'meta_ads',
              meta_lead_id: leadgenId,
              status: 'new',
            },
            { onConflict: 'phone' }
          )
          .select()
          .single()

        if (!contact) continue

        // Send welcome message if configured
        const { data: settings } = await supabase
          .from('settings')
          .select('welcome_template_id')
          .single()

        if (settings?.welcome_template_id) {
          const { data: template } = await supabase
            .from('message_templates')
            .select('content')
            .eq('id', settings.welcome_template_id)
            .single()

          if (template) {
            const messageBody = renderTemplate(template.content, { name: name ?? 'there' })
            await sendWhatsAppMessage({ to: phone, body: messageBody })

            const now = new Date()
            const nextEngagement = new Date()
            nextEngagement.setDate(nextEngagement.getDate() + 2)

            await supabase.from('messages').insert({
              contact_id: contact.id,
              direction: 'outbound',
              content: messageBody,
              message_type: 'template',
              status: 'sent',
              sent_by: 'bot',
            })

            await supabase
              .from('contacts')
              .update({
                status: 'contacted',
                last_message_at: now.toISOString(),
                next_engagement_at: nextEngagement.toISOString(),
              })
              .eq('id', contact.id)
          }
        }

        // Notification
        await supabase.from('notifications').insert({
          type: 'new_lead',
          title: 'New lead from Meta Ads',
          body: `${name ?? phone} submitted a form`,
          metadata: { contact_id: contact.id, leadgen_id: leadgenId },
        })
      } catch (err) {
        console.error('Meta lead processing error:', err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
