import { NextRequest, NextResponse } from 'next/server'
import { runVoiceCampaignJob } from '@/lib/jobs/voice-campaign'

/**
 * Voice campaign runner scheduled endpoint.
 * Called every minute by Netlify Scheduled Functions.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runVoiceCampaignJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
