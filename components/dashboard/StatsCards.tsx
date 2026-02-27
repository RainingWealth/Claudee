'use client'

import { useEffect, useState } from 'react'
import { AnalyticsStats } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import {
  MessageSquare,
  Bot,
  PhoneCall,
  TrendingUp,
  Users,
  Phone,
} from 'lucide-react'

export function StatsCards() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      icon: Users,
      label: 'Total leads',
      value: stats.whatsapp.total_contacts,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: Bot,
      label: 'Bot active',
      value: stats.whatsapp.bot_active_contacts,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: MessageSquare,
      label: 'Msgs sent today',
      value: stats.whatsapp.messages_sent_today,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      icon: TrendingUp,
      label: 'Response rate',
      value: `${stats.whatsapp.response_rate}%`,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      icon: Phone,
      label: 'Calls today',
      value: stats.voice.calls_today,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      icon: PhoneCall,
      label: 'Answer rate',
      value: `${stats.voice.answer_rate}%`,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
