import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()
  const body = await req.json()

  const { name, category, content, variables = [] } = body
  if (!name || !content) {
    return NextResponse.json({ error: 'name and content are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('message_templates')
    .insert({ name, category: category ?? 'custom', content, variables })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
