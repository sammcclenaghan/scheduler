import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Calendar from "../components/calendar/calendar";
import type { CalendarEvent } from "../components/calendar/calendar-types";
import { CourseSearch } from "../components/CourseSearch";
import { sectionsToEvents } from "../lib/section-to-events";
import type { CourseSearchResult } from "../lib/types";

export const Route = createFileRoute("/schedule")({
  component: Schedule,
});

function Schedule() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const handleCourseSelect = (result: CourseSearchResult) => {
    console.log(
      "Sections:",
      result.defaultSections.map((s) => ({ time: s.time, days: s.days })),
    );
    const newEvents = sectionsToEvents(result.defaultSections, date);
    console.log("Events:", newEvents);
    setEvents((prev) => [...prev, ...newEvents]);
  };

  return (
    <div className="flex h-screen">
      <aside className="w-80 bg-gray-900 text-white border-r border-gray-700 shrink-0 overflow-hidden">
        <CourseSearch onCourseSelect={handleCourseSelect} />
      </aside>
      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full bg-card text-card-foreground rounded-xl shadow-sm overflow-hidden border border-border">
          <Calendar
            events={events}
            setEvents={setEvents}
            date={date}
            setDate={setDate}
          />
        </div>
      </main>
    </div>
  );
}
