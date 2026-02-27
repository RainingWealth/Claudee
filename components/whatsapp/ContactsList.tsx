'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Contact, LeadStatus } from '@/types'
import { LeadStatusBadge } from './LeadStatusBadge'
import { BotToggle } from './BotToggle'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, UserPlus, Download, Bot, BotOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const STATUS_OPTIONS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'closed', label: 'Closed' },
]

export function ContactsList() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [botFilter, setBotFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function loadContacts() {
    setLoading(true)
    let query = supabase
      .from('contacts')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (botFilter === 'enabled') query = query.eq('bot_enabled', true)
    if (botFilter === 'disabled') query = query.eq('bot_enabled', false)
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data } = await query.limit(100)
    setContacts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadContacts() }, [statusFilter, botFilter])

  useEffect(() => {
    const t = setTimeout(loadContacts, 300)
    return () => clearTimeout(t)
  }, [search])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('contacts-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, loadContacts)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === contacts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map((c) => c.id)))
    }
  }

  async function bulkToggleBot(enabled: boolean) {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/whatsapp/contacts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bot_enabled: enabled }),
        })
      )
    )
    toast.success(`Bot ${enabled ? 'enabled' : 'disabled'} for ${ids.length} contact(s)`)
    setSelected(new Set())
    loadContacts()
  }

  async function exportCSV() {
    const rows = contacts.map((c) => [
      c.name ?? '',
      c.phone,
      c.email ?? '',
      c.status,
      c.lead_score,
      c.source,
      c.bot_enabled ? 'yes' : 'no',
      c.created_at,
    ])
    const header = ['Name', 'Phone', 'Email', 'Status', 'Score', 'Source', 'Bot', 'Created']
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={botFilter} onValueChange={(v) => setBotFilter(v as 'all' | 'enabled' | 'disabled')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bots</SelectItem>
            <SelectItem value="enabled">Bot on</SelectItem>
            <SelectItem value="disabled">Bot off</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Link href="/whatsapp/new">
          <Button size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Add contact
          </Button>
        </Link>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkToggleBot(true)}>
            <Bot className="mr-2 h-4 w-4" />
            Enable bot
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkToggleBot(false)}>
            <BotOff className="mr-2 h-4 w-4" />
            Disable bot
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={selected.size === contacts.length && contacts.length > 0}
                  onCheckedChange={selectAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last message</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bot</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No contacts found
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.has(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/whatsapp/${contact.id}`} className="hover:underline">
                      <div className="font-medium">{contact.name ?? 'Unknown'}</div>
                      <div className="text-muted-foreground text-xs">{contact.phone}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <LeadStatusBadge status={contact.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {contact.lead_score}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {contact.last_message_at
                      ? formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <BotToggle
                      contactId={contact.id}
                      enabled={contact.bot_enabled}
                      size="sm"
                      onToggle={() => {}}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {contact.source.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
