import { cn } from '@/lib/utils'

interface CalendarHeaderActionsProps {
  children: React.ReactNode
  className?: string
}

export default function CalendarHeaderActions({ children, className }: CalendarHeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  )
}
