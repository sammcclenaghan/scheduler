import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { useCalendarContext } from '../../calendar-context'
import { Button } from '@/components/ui/button'

export default function CalendarHeaderDate() {
  const { date, setDate, calendarIconIsToday } = useCalendarContext()

  const goToToday = () => {
    setDate(new Date())
  }

  const goToPrevious = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
  }

  const goToNext = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
  }

  return (
    <div className="flex items-center gap-4">
      {calendarIconIsToday && (
        <Button variant="outline" size="sm" onClick={goToToday}>
          <CalendarIcon className="h-4 w-4" />
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={goToPrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <h2 className="text-lg font-semibold min-w-[200px] text-center">
        {format(date, 'MMMM yyyy')}
      </h2>
      <Button variant="outline" size="sm" onClick={goToNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
