import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useCalendarContext } from "../calendar-context";
import CalendarEvent from "../calendar-event";

export default function CalendarBody() {
	return <WeekView />;
}

function WeekView() {
	const { events, date } = useCalendarContext();

	const weekStart = startOfWeek(date);
	const monday = addDays(weekStart, 1);
	const weekDays = Array.from({ length: 5 }, (_, i) => addDays(monday, i));

	const timeSlots = Array.from({ length: 12 }, (_, i) => {
		const hour = 8 + i;
		if (hour === 12) return "12 PM";
		return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="z-10 flex-shrink-0 border-b border-border bg-surface">
				<div className="flex">
					<div className="w-16 flex-shrink-0 p-4" aria-hidden="true" />
					{weekDays.map((day, dayIndex) => (
						<div
							key={day.toISOString()}
							className={cn(
								"flex-1 px-3 py-4 text-center text-sm",
								dayIndex > 0 && "border-l border-border",
							)}
						>
							<p className="font-semibold tracking-tight text-foreground">
								{format(day, "EEE")}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{format(day, "MMM d")}
							</p>
						</div>
					))}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				<div
					className="grid"
					style={{ gridTemplateRows: "repeat(12, minmax(96px, 1fr))" }}
				>
					{timeSlots.map((timeLabel, timeIndex) => {
						const hour = 8 + timeIndex;

						return (
							<div
								key={timeLabel}
								className="grid border-b border-border"
								style={{ gridTemplateColumns: "64px repeat(5, 1fr)" }}
							>
								<div className="flex w-16 items-start justify-center border-r border-border bg-surface p-3 text-[11px] font-medium text-muted-foreground">
									{timeLabel}
								</div>

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
												dayIndex > 0 && "border-l border-border",
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
		</div>
	);
}
