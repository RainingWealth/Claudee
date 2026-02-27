'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Bot,
  MessageSquare,
  Phone,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  Users,
  PhoneCall,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: BarChart2,
  },
  {
    label: 'WhatsApp CRM',
    href: '/whatsapp',
    icon: MessageSquare,
    children: [
      { label: 'Contacts', href: '/whatsapp', icon: Users },
      { label: 'Settings', href: '/whatsapp/settings', icon: Settings },
    ],
  },
  {
    label: 'Voice AI',
    href: '/voice',
    icon: Phone,
    children: [
      { label: 'Campaigns', href: '/voice', icon: PhoneCall },
      { label: 'Settings', href: '/voice/settings', icon: Settings },
    ],
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart2,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">AI Agency</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <NavItem
          href="/"
          icon={BarChart2}
          label="Dashboard"
          active={pathname === '/'}
        />

        {/* WhatsApp Section */}
        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            WhatsApp
          </p>
          <NavItem
            href="/whatsapp"
            icon={MessageSquare}
            label="CRM Contacts"
            active={pathname === '/whatsapp'}
          />
          <NavItem
            href="/whatsapp/settings"
            icon={Settings}
            label="WA Settings"
            active={pathname === '/whatsapp/settings'}
          />
        </div>

        {/* Voice AI Section */}
        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Voice AI
          </p>
          <NavItem
            href="/voice"
            icon={PhoneCall}
            label="Campaigns"
            active={pathname === '/voice' || pathname.startsWith('/voice/') && !pathname.startsWith('/voice/settings')}
          />
          <NavItem
            href="/voice/settings"
            icon={Settings}
            label="Voice Settings"
            active={pathname === '/voice/settings'}
          />
        </div>

        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Reports
          </p>
          <NavItem
            href="/analytics"
            icon={BarChart2}
            label="Analytics"
            active={pathname === '/analytics'}
          />
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}
