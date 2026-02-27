import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('voice_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()

  const {
    name,
    retell_agent_id,
    operating_hours_start,
    operating_hours_end,
    timezone = 'UTC',
    max_concurrent_calls = 3,
  } = body

  if (!name || !retell_agent_id) {
    return NextResponse.json({ error: 'name and retell_agent_id are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('voice_campaigns')
    .insert({
      name,
      retell_agent_id,
      operating_hours_start,
      operating_hours_end,
      timezone,
      max_concurrent_calls,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
