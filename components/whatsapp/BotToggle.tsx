'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bot } from 'lucide-react'
import { toast } from 'sonner'

interface BotToggleProps {
  contactId: string
  enabled: boolean
  onToggle?: (newValue: boolean) => void
  size?: 'sm' | 'default'
}

export function BotToggle({ contactId, enabled, onToggle, size = 'default' }: BotToggleProps) {
  const [value, setValue] = useState(enabled)
  const [loading, setLoading] = useState(false)

  async function handleToggle(checked: boolean) {
    setLoading(true)
    try {
      const res = await fetch(`/api/whatsapp/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_enabled: checked }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setValue(checked)
      onToggle?.(checked)
      toast.success(checked ? 'Bot enabled — automated messages will resume' : 'Bot disabled — you are now in control')
    } catch {
      toast.error('Failed to update bot status')
    } finally {
      setLoading(false)
    }
  }

  if (size === 'sm') {
    return (
      <Switch
        checked={value}
        onCheckedChange={handleToggle}
        disabled={loading}
        aria-label="Toggle bot"
      />
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Bot className={`h-4 w-4 ${value ? 'text-green-600' : 'text-muted-foreground'}`} />
      <div className="flex-1">
        <Label className="text-sm font-medium cursor-pointer">
          {value ? 'Bot active' : 'Manual mode'}
        </Label>
        <p className="text-xs text-muted-foreground">
          {value ? 'Automated messages enabled' : 'You have taken over this conversation'}
        </p>
      </div>
      <Switch
        checked={value}
        onCheckedChange={handleToggle}
        disabled={loading}
        aria-label="Toggle bot"
      />
    </div>
  )
}
