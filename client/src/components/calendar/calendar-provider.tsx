import { useState } from 'react'
import { CalendarContext } from './calendar-context'
import { CalendarEvent } from './calendar-types'

interface CalendarProviderProps {
  events: CalendarEvent[]
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
  date: Date
  setDate: React.Dispatch<React.SetStateAction<Date>>
  calendarIconIsToday?: boolean
  children: React.ReactNode
}

export default function CalendarProvider({
  events,
  setEvents,
  date,
  setDate,
  calendarIconIsToday = true,
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
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}
