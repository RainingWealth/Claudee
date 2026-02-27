import { StatsCards } from '@/components/dashboard/StatsCards'
import { LeadFunnelChart } from '@/components/dashboard/LeadFunnelChart'
import { BarChart2 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance overview across all channels</p>
        </div>
      </div>

      <StatsCards />
      <div className="max-w-lg">
        <LeadFunnelChart />
      </div>
    </div>
  )
}
