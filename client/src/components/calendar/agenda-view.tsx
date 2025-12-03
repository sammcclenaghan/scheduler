import { format } from "date-fns";
import { MapPin, Clock, User } from "lucide-react";
import type { CalendarEvent } from "./calendar-types";

interface AgendaViewProps {
  events: CalendarEvent[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function AgendaView({ events }: AgendaViewProps) {
  const eventsByDay = DAYS.map((dayName, index) => {
    const dayEvents = events
      .filter((event) => {
        const eventDay = event.start.getDay();
        // getDay() returns 0=Sunday, so Monday=1, etc.
        return eventDay === index + 1;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return { dayName, events: dayEvents };
  });

  const hasAnyEvents = events.length > 0;

  if (!hasAnyEvents) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <p className="text-center">
          No classes scheduled yet.<br />
          Search for courses to add them to your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {eventsByDay.map(({ dayName, events: dayEvents }) => (
        <div key={dayName} className="border-b border-border last:border-b-0">
          <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">{dayName}</h3>
          </div>

          {dayEvents.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No classes
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const { section } = event;
  const timeStr = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;

  const scheduleTypeBadge = () => {
    const type = section.scheduleType.toLowerCase();
    if (type === "lecture") return "LEC";
    if (type === "lab") return "LAB";
    if (type === "tutorial") return "TUT";
    return section.scheduleType.slice(0, 3).toUpperCase();
  };

  const enrollmentStatus = () => {
    if (section.enrollmentSeatsAvailable > 0) {
      return { label: "Open", className: "bg-emerald-500/20 text-emerald-400" };
    }
    if (section.waitlistSeatsAvailable > 0) {
      return { label: "Waitlist", className: "bg-amber-500/20 text-amber-400" };
    }
    return { label: "Full", className: "bg-red-500/20 text-red-400" };
  };

  const status = enrollmentStatus();

  return (
    <div className="px-4 py-3 flex gap-3">
      {/* Color bar */}
      <div
        className="w-1 rounded-full shrink-0"
        style={{ backgroundColor: event.color }}
      />

      <div className="flex-1 min-w-0">
        {/* Header: Course code + section + type */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground">
            {section.subject} {section.courseNumber}
          </span>
          <span className="text-muted-foreground text-sm">
            {section.section}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            {scheduleTypeBadge()}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{timeStr}</span>
          </div>

          {section.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{section.location}</span>
            </div>
          )}

          {section.instructor && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{section.instructor}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment numbers */}
      <div className="text-right text-xs text-muted-foreground shrink-0">
        <div>{section.enrollmentActual}/{section.enrollmentMaximum}</div>
        <div className="text-[10px]">enrolled</div>
      </div>
    </div>
  );
}
