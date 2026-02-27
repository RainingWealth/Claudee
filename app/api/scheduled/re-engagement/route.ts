import { NextRequest, NextResponse } from 'next/server'
import { runReEngagementJob } from '@/lib/jobs/re-engagement'

/**
 * Re-engagement scheduled endpoint.
 * Called every 30 minutes by Netlify Scheduled Functions.
 * Protected by CRON_SECRET to prevent unauthorized triggering.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runReEngagementJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Allow GET for manual testing in browser
export async function GET(req: NextRequest) {
  return POST(req)
}
