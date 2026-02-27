'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact, Message, MessageTemplate } from '@/types'
import { MessageBubble } from './MessageBubble'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ConversationViewProps {
  contact: Contact
}

export function ConversationView({ contact }: ConversationViewProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  async function loadTemplates() {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('active', true)
    setTemplates(data ?? [])
  }

  useEffect(() => {
    loadMessages()
    loadTemplates()
  }, [contact.id])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${contact.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contact.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [contact.id])

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      const filled = tpl.content.replace(/\{\{name\}\}/g, contact.name ?? 'there')
      setText(filled)
    }
  }

  async function sendMessage() {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, content: text.trim() }),
      })
      if (!res.ok) throw new Error('Send failed')
      setText('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      sendMessage()
    }
  }

  // Group messages by date
  const grouped: Array<{ date: string; messages: Message[] }> = []
  for (const msg of messages) {
    const dateKey = format(new Date(msg.created_at), 'dd MMM yyyy')
    const last = grouped[grouped.length - 1]
    if (last?.date === dateKey) {
      last.messages.push(msg)
    } else {
      grouped.push({ date: dateKey, messages: [msg] })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {grouped.map(({ date, messages: dayMsgs }) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <Badge variant="outline" className="text-xs text-muted-foreground">{date}</Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {dayMsgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              No messages yet. Start the conversation below.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 space-y-2 bg-card">
        {!contact.bot_enabled && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
            Bot is disabled — you are in manual control of this conversation
          </p>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger className="h-7 text-xs w-48">
                    <SelectValue placeholder="Use template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Textarea
              placeholder="Type a message... (Cmd+Enter to send)"
              className="min-h-[80px] resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
