import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createServiceClient()
  const { searchParams } = req.nextUrl

  const status = searchParams.get('status')
  const botEnabled = searchParams.get('bot')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (botEnabled === 'true') query = query.eq('bot_enabled', true)
  if (botEnabled === 'false') query = query.eq('bot_enabled', false)
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()

  const { phone, name, email, source = 'manual', campaign_tag } = body

  if (!phone) return NextResponse.json({ error: 'Phone is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('contacts')
    .insert({ phone, name, email, source, campaign_tag })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
