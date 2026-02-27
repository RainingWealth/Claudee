'use client'

import { useEffect, useState } from 'react'
import { AnalyticsStats } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const COLORS = {
  new:       '#3b82f6',
  contacted: '#f59e0b',
  responded: '#22c55e',
  qualified: '#a855f7',
  closed:    '#6b7280',
}

export function LeadFunnelChart() {
  const [data, setData] = useState<Array<{ status: string; count: number; key: string }>>([])

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((stats: AnalyticsStats) => {
        const byStatus = stats.whatsapp.contacts_by_status
        setData(
          Object.entries(byStatus).map(([status, count]) => ({
            status: status.charAt(0).toUpperCase() + status.slice(1),
            count,
            key: status,
          }))
        )
      })
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lead funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={COLORS[entry.key as keyof typeof COLORS] ?? '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
