import { NextRequest, NextResponse } from 'next/server'
import { runReEngagementJob } from '@/lib/jobs/re-engagement'

/**
 * Re-engagement scheduled endpoint.
 * Called every 30 minutes by Vercel Cron (vercel.json) or Netlify Scheduled Functions.
 * Vercel sends:  Authorization: Bearer <CRON_SECRET>
 * Manual/Netlify sends: x-cron-secret: <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const secret = bearerToken ?? req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')

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
