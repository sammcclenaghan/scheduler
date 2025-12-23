import { useState } from 'react'
import { CalendarContext } from './calendar-context'
import type { CalendarEvent } from './calendar-types'

interface CalendarProviderProps {
  events: CalendarEvent[]
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
  date: Date
  setDate: React.Dispatch<React.SetStateAction<Date>>
  calendarIconIsToday?: boolean
  selectedTerm?: string
  onShare?: () => void
  children: React.ReactNode
}

export default function CalendarProvider({
  events,
  setEvents,
  date,
  setDate,
  calendarIconIsToday = true,
  selectedTerm,
  onShare,
  children,
}: CalendarProviderProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [manageEventDialogOpen, setManageEventDialogOpen] = useState(false)

  return (
    <CalendarContext.Provider
      value={{
        events,
        setEvents,
        date,
        setDate,
        selectedEvent,
        setSelectedEvent,
        manageEventDialogOpen,
        setManageEventDialogOpen,
        calendarIconIsToday,
        selectedTerm,
        onShare,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}
