import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: campaignId } = await params
  const supabase = await createServiceClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const text = await file.text()

  // Parse CSV
  const { data: rows, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim(),
  })

  if (errors.length > 0) {
    return NextResponse.json({ error: 'CSV parse error', details: errors }, { status: 400 })
  }

  // Build voice_leads from CSV rows
  // Expected columns: phone (required), name (optional)
  const leads = rows
    .filter((row) => row.phone || row['phone number'] || row['mobile'])
    .map((row) => ({
      campaign_id: campaignId,
      phone: (row.phone ?? row['phone number'] ?? row['mobile'] ?? '').trim(),
      name: (row.name ?? row['full name'] ?? row['first name'] ?? '').trim() || null,
    }))
    .filter((l) => l.phone.length > 0)

  if (leads.length === 0) {
    return NextResponse.json({ error: 'No valid phone numbers found in CSV. Expected a "phone" column.' }, { status: 400 })
  }

  // Insert in batches of 500
  const BATCH_SIZE = 500
  let inserted = 0
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('voice_leads').insert(batch)
    if (error) {
      return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 })
    }
    inserted += batch.length
  }

  // Update campaign total_numbers
  await supabase
    .from('voice_campaigns')
    .update({ total_numbers: inserted, updated_at: new Date().toISOString() })
    .eq('id', campaignId)

  return NextResponse.json({ inserted })
}
