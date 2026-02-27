export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/shared/Sidebar'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b flex items-center justify-end px-6 bg-card shrink-0">
          <NotificationBell />
        </header>
        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      <Toaster richColors />
    </div>
  )
}
