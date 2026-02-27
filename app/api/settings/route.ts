import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()

  const allowed = [
    'ultramsg_instance_id', 'ultramsg_token',
    'meta_verify_token', 'meta_access_token', 'meta_page_id',
    'retell_api_key', 'default_re_engagement_days',
    'welcome_template_id', 'reengagement_template_id',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
