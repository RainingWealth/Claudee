import { StatsCards } from '@/components/dashboard/StatsCards'
import { LeadFunnelChart } from '@/components/dashboard/LeadFunnelChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Recent contacts
  const { data: recentContacts } = await supabase
    .from('contacts')
    .select('id, name, phone, status, last_message_at, source')
    .order('created_at', { ascending: false })
    .limit(5)

  // Running campaigns
  const { data: runningCampaigns } = await supabase
    .from('voice_campaigns')
    .select('id, name, status, active_calls, called_count, total_numbers')
    .eq('status', 'running')
    .limit(5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your AI agency operations</p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LeadFunnelChart />

        {/* Running campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Running campaigns</CardTitle>
              <Link href="/voice" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(runningCampaigns ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active campaigns</p>
            ) : (
              <div className="space-y-3">
                {(runningCampaigns ?? []).map((c) => {
                  const progress = c.total_numbers > 0
                    ? Math.round((c.called_count / c.total_numbers) * 100)
                    : 0
                  return (
                    <Link key={c.id} href={`/voice/${c.id}`} className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.called_count} / {c.total_numbers} · {c.active_calls} active</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 shrink-0" variant="outline">
                        {progress}%
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent contacts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent leads</CardTitle>
            <Link href="/whatsapp" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(recentContacts ?? []).map((contact) => (
              <Link
                key={contact.id}
                href={`/whatsapp/${contact.id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-muted/30 rounded-lg px-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {(contact.name ?? contact.phone)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="text-xs capitalize">{contact.status}</Badge>
                  {contact.last_message_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
