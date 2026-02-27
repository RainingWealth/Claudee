/**
 * Netlify Scheduled Function — Voice Campaign Runner
 * Runs every minute. Calls the Next.js API route.
 */

export default async function handler() {
  const baseUrl = process.env.URL ?? process.env.DEPLOY_URL ?? 'http://localhost:3000'
  const secret = process.env.CRON_SECRET ?? ''

  try {
    const res = await fetch(`${baseUrl}/api/scheduled/voice-runner`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
    })
    const data = await res.json()
    console.log('[voice-runner] Result:', data)
  } catch (err) {
    console.error('[voice-runner] Error:', err)
  }
}

export const config = {
  schedule: '* * * * *',
}
