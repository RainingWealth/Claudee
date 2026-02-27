/**
 * Retell AI API client
 * Docs: https://docs.retellai.com/api-references/create-phone-call
 */

interface CreateCallOptions {
  agentId: string
  fromNumber: string   // your Retell phone number with +country code
  toNumber: string     // lead phone number with +country code
  metadata?: Record<string, string>
}

interface RetellCallResponse {
  call_id: string
  call_status: string
  agent_id: string
  from_number: string
  to_number: string
  metadata?: Record<string, unknown>
}

function getApiKey(): string {
  const key = process.env.RETELL_API_KEY
  if (!key) throw new Error('RETELL_API_KEY not configured')
  return key
}

/**
 * Create an outbound phone call via Retell AI.
 */
export async function createRetellCall(
  options: CreateCallOptions
): Promise<RetellCallResponse> {
  const apiKey = getApiKey()

  const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: options.agentId,
      from_number: options.fromNumber,
      to_number: options.toNumber,
      metadata: options.metadata,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Retell API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Retrieve a call's details (status, recording, transcript) from Retell.
 */
export async function getRetellCall(callId: string): Promise<RetellCallResponse & {
  recording_url?: string
  transcript?: string
  call_analysis?: Record<string, unknown>
}> {
  const apiKey = getApiKey()

  const res = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Retell API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Normalise a phone number to E.164 format for Retell.
 * Assumes the number already has country code if it starts with +.
 */
export function normalisePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return `+${digits}`
  // Default to +1 if no country code — update for your region
  return `+${digits}`
}

/**
 * Verify Retell webhook signature.
 * Retell signs webhook payloads with HMAC-SHA256 using your API key.
 */
export async function verifyRetellSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  try {
    const apiKey = getApiKey()
    const encoder = new TextEncoder()
    const keyData = encoder.encode(apiKey)
    const messageData = encoder.encode(rawBody)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const expected = Buffer.from(sigBuffer).toString('hex')

    return expected === signature
  } catch {
    return false
  }
}
