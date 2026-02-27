/**
 * Meta Lead Ads helper
 * Used to fetch lead details after receiving a lead webhook from Meta.
 */

interface MetaLeadData {
  id: string
  created_time: string
  field_data: Array<{
    name: string
    values: string[]
  }>
}

/**
 * Fetch lead field data from Meta Graph API using a leadgen_id.
 */
export async function fetchMetaLead(leadgenId: string): Promise<MetaLeadData> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error('META_ACCESS_TOKEN not configured')

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`,
    { next: { revalidate: 0 } }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meta API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Parse Meta lead field data into a usable object.
 */
export function parseMetaLead(leadData: MetaLeadData): {
  phone: string | null
  name: string | null
  email: string | null
  raw: Record<string, string>
} {
  const raw: Record<string, string> = {}
  let phone: string | null = null
  let firstName = ''
  let lastName = ''
  let email: string | null = null

  for (const field of leadData.field_data) {
    const value = field.values[0] ?? ''
    raw[field.name] = value

    const key = field.name.toLowerCase()
    if (key === 'phone_number' || key === 'phone') {
      phone = value.replace(/\s/g, '')
    } else if (key === 'email') {
      email = value
    } else if (key === 'first_name') {
      firstName = value
    } else if (key === 'last_name') {
      lastName = value
    } else if (key === 'full_name') {
      const parts = value.split(' ')
      firstName = parts[0] || ''
      lastName = parts.slice(1).join(' ')
    }
  }

  const name = [firstName, lastName].filter(Boolean).join(' ') || null

  return { phone, name, email, raw }
}

/**
 * Verify Meta webhook hub.signature_256 header.
 */
export async function verifyMetaSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  try {
    const secret = process.env.META_APP_SECRET
    if (!secret) return false

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(rawBody)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const expected = `sha256=${Buffer.from(sigBuffer).toString('hex')}`

    return expected === signature
  } catch {
    return false
  }
}
