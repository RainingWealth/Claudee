/**
 * UltraMSG WhatsApp API client
 * Docs: https://docs.ultramsg.com/api/post/messages
 */

interface SendMessageOptions {
  to: string       // phone number with country code, e.g. "6512345678"
  body: string
  priority?: number
}

interface SendMessageResult {
  sent: string
  message: string
  id?: string
}

function getCredentials() {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID
  const token = process.env.ULTRAMSG_TOKEN
  if (!instanceId || !token) {
    throw new Error('UltraMSG credentials not configured (ULTRAMSG_INSTANCE_ID / ULTRAMSG_TOKEN)')
  }
  return { instanceId, token }
}

/**
 * Normalise a phone number to UltraMSG's expected format.
 * Strips non-digit chars and appends "@c.us" suffix.
 */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@c.us`
}

/**
 * Send a WhatsApp text message via UltraMSG.
 */
export async function sendWhatsAppMessage(
  options: SendMessageOptions
): Promise<SendMessageResult> {
  const { instanceId, token } = getCredentials()

  const to = options.to.includes('@c.us') ? options.to : normalisePhone(options.to)

  const body = new URLSearchParams({
    token,
    to,
    body: options.body,
    priority: String(options.priority ?? 10),
  })

  const res = await fetch(
    `https://api.ultramsg.com/${instanceId}/messages/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`UltraMSG error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Replace template variables in a template string.
 * Variables use the format {{name}}, {{company}}, etc.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

/**
 * Verify that an incoming webhook payload came from UltraMSG.
 * UltraMSG doesn't sign payloads with HMAC; instead we verify the token
 * field in the payload matches our stored token.
 */
export function verifyWebhookToken(token: string): boolean {
  return token === process.env.ULTRAMSG_TOKEN
}
