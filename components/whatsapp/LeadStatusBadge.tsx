import { Badge } from '@/components/ui/badge'
import { LeadStatus } from '@/types'

const statusConfig: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  new:        { label: 'New',       variant: 'default',     className: 'bg-blue-100 text-blue-800 border-blue-200' },
  contacted:  { label: 'Contacted', variant: 'secondary',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  responded:  { label: 'Responded', variant: 'default',     className: 'bg-green-100 text-green-800 border-green-200' },
  qualified:  { label: 'Qualified', variant: 'default',     className: 'bg-purple-100 text-purple-800 border-purple-200' },
  closed:     { label: 'Closed',    variant: 'outline',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  )
}
