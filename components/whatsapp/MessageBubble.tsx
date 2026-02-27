import { Message } from '@/types'
import { Bot, User } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound'
  const isBot = message.sent_by === 'bot'

  return (
    <div className={cn('flex gap-2 max-w-[75%]', isOutbound ? 'ml-auto flex-row-reverse' : '')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1',
        isOutbound
          ? isBot ? 'bg-primary/20 text-primary' : 'bg-green-100 text-green-700'
          : 'bg-muted text-muted-foreground'
      )}>
        {isOutbound
          ? isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />
          : <User className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        'rounded-2xl px-4 py-2.5 text-sm',
        isOutbound
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-muted text-foreground rounded-tl-sm'
      )}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs',
          isOutbound ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
        )}>
          <span>{format(new Date(message.created_at), 'HH:mm')}</span>
          {isBot && <span className="italic">· bot</span>}
          {isOutbound && (
            <span>
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
