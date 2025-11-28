import type { CalendarEvent } from "./calendar-types";
import { useCalendarContext } from "./calendar-context";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Users } from "lucide-react";

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
  const group = [event, ...overlappingEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
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
            "px-3 py-1.5 rounded-md truncate cursor-pointer transition-all duration-300",
            "absolute shadow-sm ring-1 ring-black/10 dark:ring-white/10",
            "border",
            className,
          )}
          style={{
            ...style,
            backgroundColor: event.color,
            color: event.textColor ?? "#ffffff",
            borderColor: event.borderColor ?? event.color,
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
          <motion.div className={cn("flex flex-col w-full")} layout="position">
            <p className="font-bold truncate">
              {event.section.subject} {event.section.courseNumber}
            </p>
            <div className="text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{format(event.start, "h:mm a")}</span>
                <span className="mx-1">-</span>
                <span>{format(event.end, "h:mm a")}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{event.section.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="truncate">{event.section.instructor}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
