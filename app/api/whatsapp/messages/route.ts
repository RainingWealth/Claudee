import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/ultramsg'

export async function GET(req: NextRequest) {
  const supabase = await createServiceClient()
  const contactId = req.nextUrl.searchParams.get('contactId')

  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const { contactId, content } = await req.json()

  if (!contactId || !content) {
    return NextResponse.json({ error: 'contactId and content are required' }, { status: 400 })
  }

  // Fetch contact phone
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, phone, name')
    .eq('id', contactId)
    .single()

  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  // Send via UltraMSG
  let ultraMsgId: string | null = null
  try {
    const result = await sendWhatsAppMessage({ to: contact.phone, body: content })
    ultraMsgId = result.id ?? null
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to send WhatsApp message: ${String(err)}` },
      { status: 502 }
    )
  }

  // Save to database
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      contact_id: contactId,
      direction: 'outbound',
      content,
      message_type: 'text',
      ultramsg_message_id: ultraMsgId,
      status: 'sent',
      sent_by: 'human',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update contact last_message_at
  await supabase
    .from('contacts')
    .update({ last_message_at: new Date().toISOString(), status: 'contacted' })
    .eq('id', contactId)

  return NextResponse.json(message, { status: 201 })
}
