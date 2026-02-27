import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Fallback placeholders prevent build-time crashes (env vars are only required at runtime)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  return createBrowserClient(url, key)
}
