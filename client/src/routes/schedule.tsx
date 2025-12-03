import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Calendar from "../components/calendar/calendar";
import type { CalendarEvent } from "../components/calendar/calendar-types";
import { CourseSearch } from "../components/CourseSearch";
import {
  SelectedCoursesSidebar,
  type SelectedCourse,
} from "../components/SelectedCoursesSidebar";
import { sectionsToEvents } from "../lib/section-to-events";
import type { CourseSearchResult, Course, Section } from "../lib/types";
import { scheduleQueries } from "../lib/queries";
import { schedulesApi } from "../lib/api";
import { getToken, getTerm, setTerm, getShareableUrl } from "../lib/token";

type ScheduleSearch = {
  t?: string;
  term?: string;
};

export const Route = createFileRoute("/schedule")({
  component: Schedule,
  validateSearch: (search: Record<string, unknown>): ScheduleSearch => ({
    t: typeof search.t === "string" ? search.t : undefined,
    term: typeof search.term === "string" ? search.term : undefined,
  }),
});

function Schedule() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [selectedTerm, setSelectedTermState] = useState(getTerm);

  useEffect(() => {
    getToken();
  }, []);

  const setSelectedTerm = (term: string) => {
    setTerm(term);
    setSelectedTermState(term);
  };

  const { data: savedSchedule, isLoading: isLoadingSchedule } = useQuery({
    ...scheduleQueries.byTerm(selectedTerm),
  });

  const saveMutation = useMutation({
    mutationFn: (crns: string[]) => schedulesApi.save(selectedTerm, crns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", selectedTerm] });
    },
  });

  const saveSchedule = useCallback(
    (courses: SelectedCourse[]) => {
      const allCrns = courses.flatMap((sc) => sc.sections.map((s) => s.crn));
      saveMutation.mutate(allCrns);
    },
    [saveMutation],
  );

  useEffect(() => {
    if (!savedSchedule || isLoadingSchedule) return;
    if (savedSchedule.sectionCrns.length === 0) {
      setSelectedCourses([]);
      setEvents([]);
      return;
    }

    const loadSectionsFromCrns = async () => {
      const crns = savedSchedule.sectionCrns;
      const sectionsResponse = await fetch(
        `/api/sections/by-crns/${selectedTerm}?crns=${crns.join(",")}`,
      );

      if (!sectionsResponse.ok) {
        console.error("Failed to load sections from CRNs");
        return;
      }

      const sections: Section[] = await sectionsResponse.json();

      const courseMap = new Map<
        string,
        { course: Course | null; sections: Section[] }
      >();
      for (const section of sections) {
        const key =
          section.coursePid || `${section.subject}${section.courseNumber}`;
        if (!courseMap.has(key)) {
          courseMap.set(key, { course: null, sections: [] });
        }
        courseMap.get(key)!.sections.push(section);
      }

      const newSelectedCourses: SelectedCourse[] = [];
      for (const [key, { sections }] of courseMap) {
        if (sections.length === 0) continue;
        const firstSection = sections[0];
        const pseudoCourse: Course = {
          id: 0,
          createdAt: "",
          updatedAt: "",
          title: firstSection.courseName,
          pid: firstSection.coursePid || key,
          subjectCode: `${firstSection.subject} ${firstSection.courseNumber}`,
          description: "",
          credits: firstSection.units,
          hoursCatalogText: "",
          notes: "",
          preAndCorequisites: "",
        };
        newSelectedCourses.push({
          course: pseudoCourse,
          sections,
          term: selectedTerm,
        });
      }

      setSelectedCourses(newSelectedCourses);
      rebuildEvents(newSelectedCourses);
    };

    loadSectionsFromCrns();
  }, [savedSchedule, isLoadingSchedule, selectedTerm]);

  const rebuildEvents = (courses: SelectedCourse[]) => {
    const allEvents: CalendarEvent[] = [];
    courses.forEach((sc, colorIndex) => {
      const newEvents = sectionsToEvents(sc.sections, date, colorIndex);
      allEvents.push(...newEvents);
    });
    setEvents(allEvents);
  };

  const handleTermChange = (term: string) => {
    setSelectedTerm(term);
    setSelectedCourses([]);
    setEvents([]);
  };

  const handleCourseSelect = (result: CourseSearchResult, term: string) => {
    const alreadySelected = selectedCourses.some(
      (sc) => sc.course.id === result.course.id,
    );
    if (alreadySelected) return;

    const newSelectedCourse: SelectedCourse = {
      course: result.course,
      sections: result.defaultSections,
      term,
    };

    const newCourses = [...selectedCourses, newSelectedCourse];
    setSelectedCourses(newCourses);
    addEventsForCourse(result.course, result.defaultSections);
    saveSchedule(newCourses);
  };

  const addEventsForCourse = (course: Course, sections: Section[]) => {
    if (sections.length === 0) return;

    const courseId = course.subjectCode;
    const existingCourseIds = Array.from(
      new Set(selectedCourses.map((sc) => sc.course.subjectCode)),
    );

    let colorIndex = existingCourseIds.indexOf(courseId);
    if (colorIndex === -1) {
      colorIndex = existingCourseIds.length;
    }

    const newEvents = sectionsToEvents(sections, date, colorIndex);
    setEvents((prev) => {
      const filteredPrev = prev.filter(
        (e) =>
          `${e.section.subject} ${e.section.courseNumber}` !==
          `${sections[0]?.subject} ${sections[0]?.courseNumber}`,
      );
      return [...filteredPrev, ...newEvents];
    });
  };

  const handleCourseRemove = (course: Course) => {
    const newCourses = selectedCourses.filter(
      (sc) => sc.course.id !== course.id,
    );
    setSelectedCourses(newCourses);

    setEvents((prev) =>
      prev.filter((e) => {
        const eventCourseCode = `${e.section.subject}${e.section.courseNumber}`;
        return eventCourseCode !== course.subjectCode.replace(/\s/g, "");
      }),
    );

    saveSchedule(newCourses);
  };

  const handleSectionsUpdate = (course: Course, sections: Section[]) => {
    const newCourses = selectedCourses.map((sc) =>
      sc.course.id === course.id ? { ...sc, sections } : sc,
    );
    setSelectedCourses(newCourses);

    setEvents((prev) => {
      const otherEvents = prev.filter((e) => {
        const eventCourseCode = `${e.section.subject}${e.section.courseNumber}`;
        return eventCourseCode !== course.subjectCode.replace(/\s/g, "");
      });

      if (sections.length === 0) return otherEvents;

      const existingCourseIds = Array.from(
        new Set(selectedCourses.map((sc) => sc.course.subjectCode)),
      );
      const colorIndex = existingCourseIds.indexOf(course.subjectCode);

      const newEvents = sectionsToEvents(
        sections,
        date,
        colorIndex >= 0 ? colorIndex : 0,
      );
      return [...otherEvents, ...newEvents];
    });

    saveSchedule(newCourses);
  };

  const handleClearAll = () => {
    setSelectedCourses([]);
    setEvents([]);
    saveSchedule([]);
  };

  const handleShare = async () => {
    const url = getShareableUrl(selectedTerm);
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex h-screen">
      <aside className="w-80 bg-gray-900 text-white border-r border-gray-700 shrink-0 overflow-hidden">
        <CourseSearch
          selectedTerm={selectedTerm}
          onTermChange={handleTermChange}
          onCourseSelect={handleCourseSelect}
        />
      </aside>
      <main className="flex-1 overflow-hidden">
        <div className="h-full bg-card text-card-foreground overflow-hidden">
          <Calendar
            events={events}
            setEvents={setEvents}
            date={date}
            setDate={setDate}
            selectedTerm={selectedTerm}
            onShare={handleShare}
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
