import { isSameDay } from "date-fns";
import { MapPin, Users } from "lucide-react";
import { cn, hexToRgba } from "@/lib/utils";
import { useCalendarContext } from "./calendar-context";
import type { CalendarEvent as CalendarEventType } from "./calendar-types";

interface EventPosition {
	left: string;
	width: string;
	top: string;
	height: string;
}

function getOverlappingEvents(
	currentEvent: CalendarEventType,
	events: CalendarEventType[],
): CalendarEventType[] {
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
	event: CalendarEventType,
	allEvents: CalendarEventType[],
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

	const startMinutes = event.start.getMinutes();
	const endMinutes = event.end.getMinutes();
	const startTotalMinutes = event.start.getHours() * 60 + startMinutes;
	const endTotalMinutes = event.end.getHours() * 60 + endMinutes;
	const duration = endTotalMinutes - startTotalMinutes;

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
	event: CalendarEventType;
	className?: string;
}) {
	const { events, setSelectedEvent, setManageEventDialogOpen } =
		useCalendarContext();
	const style = calculateEventPosition(event, events);

	return (
		<button
			type="button"
			className={cn(
				"absolute flex cursor-pointer flex-col overflow-hidden rounded-md border border-border/60 px-3 py-2.5 shadow-sm transition-shadow hover:z-10 hover:shadow-md",
				className,
			)}
			style={{
				...style,
				backgroundColor: hexToRgba(event.color, 0.14),
				borderLeft: `3px solid ${event.color}`,
				color: "var(--foreground)",
			}}
			onClick={(e) => {
				e.stopPropagation();
				setSelectedEvent(event);
				setManageEventDialogOpen(true);
			}}
			aria-label={`${event.section.subject} ${event.section.courseNumber} ${event.section.section}`}
		>
			<div className="flex h-full w-full flex-col gap-0.5">
				<p className="truncate text-sm font-semibold tracking-tight text-foreground">
					{event.section.subject} {event.section.courseNumber}{" "}
					{event.section.section}
				</p>
				<div className="flex min-h-0 flex-col gap-1 text-[11px] leading-[1.25] text-muted-foreground">
					<div className="flex min-w-0 items-center gap-1">
						<MapPin className="h-3 w-3 shrink-0 opacity-75" />
						<span className="truncate">{event.section.location}</span>
					</div>

					{event.section.scheduleType === "Lecture" && (
						<div className="flex min-w-0 items-center gap-1">
							<Users className="h-3 w-3 shrink-0 opacity-75" />
							<span className="truncate">{event.section.instructor}</span>
						</div>
					)}
				</div>
			</div>
		</button>
	);
}
