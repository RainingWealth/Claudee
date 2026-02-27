import { ContactsList } from '@/components/whatsapp/ContactsList'
import { MessageSquare } from 'lucide-react'

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp CRM</h1>
          <p className="text-sm text-muted-foreground">
            Manage leads, automate messages, and track conversations
          </p>
        </div>
      </div>
      <ContactsList />
    </div>
  )
}
