import type { Section } from '@/lib/types'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color: string
  section: Section
  textColor?: string
  borderColor?: string
}

export interface CalendarProps {
  events: CalendarEvent[]
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
  date: Date
  setDate: React.Dispatch<React.SetStateAction<Date>>
  calendarIconIsToday?: boolean
  selectedTerm?: string
  onShare?: () => void
}
