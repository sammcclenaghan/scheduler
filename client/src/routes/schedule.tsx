import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Calendar from '../components/calendar/calendar'
import type { CalendarEvent } from '../components/calendar/calendar-types'

export const Route = createFileRoute('/schedule')({
  component: Schedule,
})

function Schedule() {
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  return (
    <div className="h-full w-full p-6">
      <div className="h-full bg-card text-card-foreground rounded-xl shadow-sm overflow-hidden border border-border">
        <Calendar
          events={events}
          setEvents={setEvents}
          date={date}
          setDate={setDate}
        />
      </div>
    </div>
  )
}

