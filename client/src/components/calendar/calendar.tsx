import type { CalendarProps } from './calendar-types'
import CalendarHeader from './header/calendar-header'
import CalendarBody from './body/calendar-body'
import CalendarProvider from './calendar-provider'

export default function Calendar({
  events,
  setEvents,
  date,
  setDate,
  calendarIconIsToday = true,
  selectedTerm,
  onShare,
}: CalendarProps) {
  return (
    <div className="h-full flex flex-col">
      <CalendarProvider
        events={events}
        setEvents={setEvents}
        date={date}
        setDate={setDate}
        calendarIconIsToday={calendarIconIsToday}
        selectedTerm={selectedTerm}
        onShare={onShare}
      >
        <CalendarHeader />
        <CalendarBody />
      </CalendarProvider>
    </div>
  )
}
