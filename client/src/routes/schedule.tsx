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

    if (result.defaultSections.length === 0) return;

    const subject = result.defaultSections[0].subject;
    const courseNumber = result.defaultSections[0].courseNumber;
    const courseId = `${subject} ${courseNumber}`;

    const uniqueCourses = Array.from(
      new Set(events.map((e) => `${e.section.subject} ${e.section.courseNumber}`)),
    );

    let colorIndex = uniqueCourses.indexOf(courseId);
    if (colorIndex === -1) {
      colorIndex = uniqueCourses.length;
    }

    const newEvents = sectionsToEvents(result.defaultSections, date, colorIndex);
    console.log("Events:", newEvents);
    setEvents((prev) => [...prev, ...newEvents]);
  };

  return (
    <div className="flex h-screen">
      <aside className="w-80 bg-gray-900 text-white border-r border-gray-700 shrink-0 overflow-hidden">
        <CourseSearch onCourseSelect={handleCourseSelect} />
      </aside>
      <main className="flex-1 overflow-hidden">
        <div className="h-full bg-card text-card-foreground overflow-hidden">
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
