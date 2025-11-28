import { createContext, useContext } from 'react'
import { CalendarEvent } from './calendar-types'

interface CalendarContextType {
  events: CalendarEvent[]
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
  date: Date
  setDate: React.Dispatch<React.SetStateAction<Date>>
  selectedEvent: CalendarEvent | null
  setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
  manageEventDialogOpen: boolean
  setManageEventDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  calendarIconIsToday: boolean
}

export const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export const useCalendarContext = () => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider')
  }
  return context
}
