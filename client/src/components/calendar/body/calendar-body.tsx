import { useCalendarContext } from "../calendar-context";
import CalendarEvent from "../calendar-event";
import { format, startOfWeek, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function CalendarBody() {
  return <WeekView />;
}

function WeekView() {
  const { events, date } = useCalendarContext();

  // Get Monday of the current week
  const weekStart = startOfWeek(date);
  const monday = addDays(weekStart, 1); // Add 1 to get Monday (startOfWeek returns Sunday)
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(monday, i)); // Monday to Friday

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i; // Start from 8 AM to 7 PM (12 slots)
    // Correctly format noon as PM and use AM/PM for other hours
    return hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  });

  return (
    <div className="flex-1 overflow-auto min-h-full flex flex-col">
      {/* Header with day names */}
      <div className="border-b sticky top-0 bg-background z-10 flex-shrink-0">
        <div className="flex">
          {/* Empty cell for the time column alignment */}
          <div className="p-3 w-12 flex-shrink-0" aria-hidden="true" />
          {weekDays.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-3 text-center text-sm font-medium text-muted-foreground flex-1",
                dayIndex > 0 && "border-l", // Only add left border for columns after Monday
              )}
            >
              <div className="font-medium">{format(day, "EEE")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div
        className="grid"
        style={{ gridTemplateRows: "repeat(12, 1fr)", height: "100%" }}
      >
        {timeSlots.map((timeLabel, timeIndex) => {
          const hour = 8 + timeIndex;

          return (
            <div
              key={timeLabel}
              className="grid border-b"
              style={{ gridTemplateColumns: "48px repeat(5, 1fr)" }}
            >
              {/* Time column */}
              <div className="p-1 text-xs text-muted-foreground text-center border-r w-12 flex-shrink-0 bg-muted/20 flex items-start justify-center pt-2">
                {timeLabel}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIndex) => {
                const dayEvents = events.filter((event) => {
                  const eventDate = startOfDay(event.start);
                  const currentDate = startOfDay(day);
                  return (
                    eventDate.getTime() === currentDate.getTime() &&
                    Math.floor(event.start.getHours()) === hour
                  );
                });

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative",
                      dayIndex > 0 && "border-l", // Only add left border for columns after Monday
                    )}
                  >
                    <div className="relative h-full">
                      {dayEvents.map((event) => (
                        <CalendarEvent key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
