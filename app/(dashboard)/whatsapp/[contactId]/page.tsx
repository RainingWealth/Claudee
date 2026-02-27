import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ConversationView } from '@/components/whatsapp/ConversationView'
import { BotToggle } from '@/components/whatsapp/BotToggle'
import { LeadStatusBadge } from '@/components/whatsapp/LeadStatusBadge'
import { ReEngagementSettings } from '@/components/whatsapp/ReEngagementSettings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Phone, Mail, Star } from 'lucide-react'
import Link from 'next/link'
import { LeadStatus } from '@/types'

interface Props {
  params: Promise<{ contactId: string }>
}

export default async function ContactPage({ params }: Props) {
  const { contactId } = await params
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (!contact) notFound()

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left: contact info */}
      <aside className="w-72 shrink-0 space-y-4 overflow-y-auto">
        <Link href="/whatsapp">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to contacts
          </Button>
        </Link>

        {/* Contact header */}
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-3">
            {(contact.name ?? contact.phone)[0].toUpperCase()}
          </div>
          <h2 className="text-lg font-semibold">{contact.name ?? 'Unknown'}</h2>
          <p className="text-sm text-muted-foreground">{contact.phone}</p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {contact.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{contact.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-4 w-4" />
            <span>Lead score: {contact.lead_score}</span>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Status</p>
          <LeadStatusSelect contactId={contact.id} currentStatus={contact.status as LeadStatus} />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">{contact.source.replace('_', ' ')}</Badge>
          {contact.campaign_tag && (
            <Badge variant="secondary" className="text-xs">{contact.campaign_tag}</Badge>
          )}
        </div>

        {/* Bot toggle */}
        <BotToggle
          contactId={contact.id}
          enabled={contact.bot_enabled}
        />

        {/* Re-engagement */}
        <ReEngagementSettings
          contactId={contact.id}
          currentInterval={contact.re_engagement_interval_days}
        />
      </aside>

      {/* Right: conversation */}
      <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-card">
        <div className="px-4 py-3 border-b flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            {(contact.name ?? contact.phone)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm">{contact.name ?? contact.phone}</p>
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
          </div>
          <div className="ml-auto">
            <LeadStatusBadge status={contact.status as LeadStatus} />
          </div>
        </div>
        <ConversationView contact={contact as Parameters<typeof ConversationView>[0]['contact']} />
      </div>
    </div>
  )
}

// Client-side status selector
function LeadStatusSelect({ contactId, currentStatus }: { contactId: string; currentStatus: LeadStatus }) {
  'use client'
  const statuses: LeadStatus[] = ['new', 'contacted', 'responded', 'qualified', 'closed']
  return (
    <Select
      defaultValue={currentStatus}
      onValueChange={async (v) => {
        await fetch(`/api/whatsapp/contacts/${contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: v }),
        })
      }}
    >
      <SelectTrigger className="h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
