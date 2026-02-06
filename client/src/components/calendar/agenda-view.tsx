import { format } from "date-fns";
import { Clock, MapPin, User } from "lucide-react";
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
				return eventDay === index + 1;
			})
			.sort((a, b) => a.start.getTime() - b.start.getTime());

		return { dayName, events: dayEvents };
	});

	if (events.length === 0) {
		return (
			<div className="flex h-full flex-1 items-center justify-center p-8 text-muted-foreground">
				<p className="text-center text-sm leading-7">
					No classes scheduled yet.
					<br />
					Search and add courses to build your week.
				</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			{eventsByDay.map(({ dayName, events: dayEvents }) => (
				<section
					key={dayName}
					className="border-b border-border last:border-b-0"
				>
					<div className="sticky top-0 border-b border-border bg-surface/96 px-4 py-2 backdrop-blur">
						<h3 className="text-sm font-semibold tracking-tight text-foreground">
							{dayName}
						</h3>
					</div>

					{dayEvents.length === 0 ? (
						<div className="px-4 py-5 text-sm text-muted-foreground">
							No classes
						</div>
					) : (
						<div className="divide-y divide-border">
							{dayEvents.map((event) => (
								<EventCard key={event.id} event={event} />
							))}
						</div>
					)}
				</section>
			))}
		</div>
	);
}

function EventCard({ event }: { event: CalendarEvent }) {
	const { section } = event;
	const timeStr = `${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")}`;

	const scheduleTypeBadge = () => {
		const type = section.scheduleType.toLowerCase();
		if (type === "lecture") return "LEC";
		if (type === "lab") return "LAB";
		if (type === "tutorial") return "TUT";
		return section.scheduleType.slice(0, 3).toUpperCase();
	};

	const enrollmentStatus = () => {
		if (section.enrollmentSeatsAvailable > 0) {
			return {
				label: "Open",
				className: "bg-success/15 text-success-foreground",
			};
		}
		if (section.waitlistSeatsAvailable > 0) {
			return {
				label: "Waitlist",
				className: "bg-warning/20 text-warning-foreground",
			};
		}
		return { label: "Full", className: "bg-destructive/12 text-destructive" };
	};

	const status = enrollmentStatus();

	return (
		<article className="flex gap-3 px-4 py-3">
			<div
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: event.color }}
			/>

			<div className="min-w-0 flex-1">
				<div className="mb-1 flex flex-wrap items-center gap-2">
					<span className="text-sm font-semibold tracking-tight text-foreground">
						{section.subject} {section.courseNumber}
					</span>
					<span className="text-xs text-muted-foreground">
						{section.section}
					</span>
					<span className="chip px-2 py-0.5 text-[10px]">
						{scheduleTypeBadge()}
					</span>
					<span
						className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
					>
						{status.label}
					</span>
				</div>

				<div className="flex flex-col gap-1 text-xs text-muted-foreground">
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

			<div className="shrink-0 text-right text-[11px] text-muted-foreground">
				<div>
					{section.enrollmentActual}/{section.enrollmentMaximum}
				</div>
				<div className="text-[10px]">enrolled</div>
			</div>
		</article>
	);
}
