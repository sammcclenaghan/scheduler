import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Calendar from "../components/calendar/calendar";
import type { CalendarEvent } from "../components/calendar/calendar-types";
import { CourseSearch } from "../components/CourseSearch";
import {
  SelectedCoursesSidebar,
  type SelectedCourse,
} from "../components/SelectedCoursesSidebar";
import { sectionsToEvents } from "../lib/section-to-events";
import type { CourseSearchResult, Course, Section } from "../lib/types";

export const Route = createFileRoute("/schedule")({
  component: Schedule,
});

function Schedule() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);

  const handleCourseSelect = (result: CourseSearchResult, term: string) => {
    const alreadySelected = selectedCourses.some(
      (sc) => sc.course.id === result.course.id
    );
    if (alreadySelected) return;

    const newSelectedCourse: SelectedCourse = {
      course: result.course,
      sections: result.defaultSections,
      term,
    };

    setSelectedCourses((prev) => [...prev, newSelectedCourse]);
    addEventsForCourse(result.course, result.defaultSections);
  };

  const addEventsForCourse = (course: Course, sections: Section[]) => {
    if (sections.length === 0) return;

    const courseId = course.subjectCode;
    const existingCourseIds = Array.from(
      new Set(
        selectedCourses.map((sc) => sc.course.subjectCode)
      )
    );

    let colorIndex = existingCourseIds.indexOf(courseId);
    if (colorIndex === -1) {
      colorIndex = existingCourseIds.length;
    }

    const newEvents = sectionsToEvents(sections, date, colorIndex);
    setEvents((prev) => {
      const filteredPrev = prev.filter(
        (e) => `${e.section.subject} ${e.section.courseNumber}` !== `${sections[0]?.subject} ${sections[0]?.courseNumber}`
      );
      return [...filteredPrev, ...newEvents];
    });
  };

  const handleCourseRemove = (course: Course) => {
    setSelectedCourses((prev) =>
      prev.filter((sc) => sc.course.id !== course.id)
    );

    setEvents((prev) =>
      prev.filter((e) => {
        const eventCourseCode = `${e.section.subject}${e.section.courseNumber}`;
        return eventCourseCode !== course.subjectCode.replace(/\s/g, "");
      })
    );
  };

  const handleSectionsUpdate = (course: Course, sections: Section[]) => {
    setSelectedCourses((prev) =>
      prev.map((sc) =>
        sc.course.id === course.id ? { ...sc, sections } : sc
      )
    );

    setEvents((prev) => {
      const otherEvents = prev.filter((e) => {
        const eventCourseCode = `${e.section.subject}${e.section.courseNumber}`;
        return eventCourseCode !== course.subjectCode.replace(/\s/g, "");
      });

      if (sections.length === 0) return otherEvents;

      const existingCourseIds = Array.from(
        new Set(selectedCourses.map((sc) => sc.course.subjectCode))
      );
      const colorIndex = existingCourseIds.indexOf(course.subjectCode);

      const newEvents = sectionsToEvents(sections, date, colorIndex >= 0 ? colorIndex : 0);
      return [...otherEvents, ...newEvents];
    });
  };

  const handleClearAll = () => {
    setSelectedCourses([]);
    setEvents([]);
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
      <aside className="w-80 border-l border-gray-700 shrink-0 overflow-y-auto overflow-x-visible z-10">
        <SelectedCoursesSidebar
          selectedCourses={selectedCourses}
          onCourseRemove={handleCourseRemove}
          onSectionsUpdate={handleSectionsUpdate}
          onClearAll={handleClearAll}
        />
      </aside>
    </div>
  );
}
