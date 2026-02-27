/**
 * Netlify Scheduled Function — Re-engagement
 * Runs every 30 minutes. Calls the Next.js API route.
 * The CRON_SECRET is used to authenticate the request.
 */

export default async function handler() {
  const baseUrl = process.env.URL ?? process.env.DEPLOY_URL ?? 'http://localhost:3000'
  const secret = process.env.CRON_SECRET ?? ''

  try {
    const res = await fetch(`${baseUrl}/api/scheduled/re-engagement`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
    })
    const data = await res.json()
    console.log('[re-engagement] Result:', data)
  } catch (err) {
    console.error('[re-engagement] Error:', err)
  }
}

export const config = {
  schedule: '*/30 * * * *',
}
