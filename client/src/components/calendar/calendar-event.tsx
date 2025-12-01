import type { CalendarEvent } from "./calendar-types";
import { useCalendarContext } from "./calendar-context";
import { isSameDay } from "date-fns";
import { cn, hexToRgba } from "@/lib/utils";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";
import { MapPin, Users } from "lucide-react";

interface EventPosition {
  left: string;
  width: string;
  top: string;
  height: string;
}

function getOverlappingEvents(
  currentEvent: CalendarEvent,
  events: CalendarEvent[],
): CalendarEvent[] {
  return events.filter((event) => {
    if (event.id === currentEvent.id) return false;
    return (
      currentEvent.start < event.end &&
      currentEvent.end > event.start &&
      isSameDay(currentEvent.start, event.start)
    );
  });
}

function calculateEventPosition(
  event: CalendarEvent,
  allEvents: CalendarEvent[],
): EventPosition {
  const overlappingEvents = getOverlappingEvents(event, allEvents);
  const group = [event, ...overlappingEvents].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    const durationDiff =
      b.end.getTime() -
      b.start.getTime() -
      (a.end.getTime() - a.start.getTime());
    if (durationDiff !== 0) return durationDiff;
    return a.id.localeCompare(b.id);
  });
  const position = group.indexOf(event);
  const width = `${100 / (overlappingEvents.length + 1)}%`;
  const left = `${(position * 100) / (overlappingEvents.length + 1)}%`;

  // For week view, position relative to the hour slot (60px high)
  const startMinutes = event.start.getMinutes();
  const endMinutes = event.end.getMinutes();

  // Calculate duration in minutes
  const startTotalMinutes = event.start.getHours() * 60 + startMinutes;
  const endTotalMinutes = event.end.getHours() * 60 + endMinutes;
  const duration = endTotalMinutes - startTotalMinutes;

  // Position within the hour slot as percentage
  const topPercent = (startMinutes / 60) * 100;
  const heightPercent = (duration / 60) * 100;

  return {
    left,
    width,
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
  };
}

export default function CalendarEvent({
  event,
  className,
}: {
  event: CalendarEvent;
  className?: string;
}) {
  const { events, setSelectedEvent, setManageEventDialogOpen } =
    useCalendarContext();
  const style = calculateEventPosition(event, events);

  // Generate a unique key for animations
  const animationKey = `${event.id}`;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          className={cn(
            "px-2.5 py-2 rounded-md cursor-pointer transition-all duration-200",
            "absolute shadow-sm hover:shadow-md hover:z-10 border-l-4",
            "flex flex-col overflow-hidden",
            className,
          )}
          style={{
            ...style,
            backgroundColor: hexToRgba(event.color, 0.15),
            borderColor: event.color,
            color: "var(--foreground)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEvent(event);
            setManageEventDialogOpen(true);
          }}
          initial={{
            opacity: 0,
            y: -3,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.98,
            transition: {
              duration: 0.15,
              ease: "easeOut",
            },
          }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
            opacity: {
              duration: 0.2,
              ease: "linear",
            },
            layout: {
              duration: 0.2,
              ease: "easeOut",
            },
          }}
          layoutId={`event-${animationKey}-day`}
        >
          <motion.div className={cn("flex flex-col w-full h-full")} layout="position">
            <div className="font-bold text-xs sm:text-sm leading-tight mb-0.5 truncate text-foreground/90">
              {event.section.subject} {event.section.courseNumber} {event.section.section}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground flex flex-col gap-0.5 min-h-0">
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{event.section.location}</span>
              </div>

              {event.section.scheduleType === "Lecture" && (
                <div className="flex items-center gap-1 min-w-0">
                  <Users className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{event.section.instructor}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
