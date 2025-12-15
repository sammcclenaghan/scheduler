import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Calendar as CalendarIcon, List } from "lucide-react";
import Calendar from "../components/calendar/calendar";
import AgendaView from "../components/calendar/agenda-view";
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
import {
  getSharedToken,
  getOwnToken,
  getTerm,
  setTerm,
  getShareableUrl,
} from "../lib/token";

type ScheduleSearch = {
  t?: string;
  term?: string;
};

export const Route = createFileRoute("/schedule")({
  component: Schedule,
  validateSearch: (search: Record<string, unknown>): ScheduleSearch => ({
    t: search.t as string,
    term: search.term as string,
  }),
});

type MobileView = "search" | "calendar" | "courses";

function Schedule() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [selectedTerm, setSelectedTermState] = useState(() => getTerm());
  const [mobileView, setMobileView] = useState<MobileView>("calendar");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);

  // Join shared schedule if opened via shared link
  // Read directly from window.location on mount to capture params before any routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTermParam = params.get("term");
    const sharedToken = getSharedToken();
    const ownToken = getOwnToken();

    // Sync term from URL to state
    if (urlTermParam) {
      setSelectedTermState(urlTermParam);
      setTerm(urlTermParam);
    }

    const termToUse = urlTermParam || selectedTerm;

    if (sharedToken && sharedToken !== ownToken && !hasJoined) {
      schedulesApi
        .join(termToUse, sharedToken)
        .then(() => {
          setHasJoined(true);
          queryClient.invalidateQueries({ queryKey: ["schedules"] });
        })
        .catch(console.error);
    }
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
      (sc) => sc.course.pid === result.course.pid,
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
    setMobileView("calendar");
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
      (sc) => sc.course.pid !== course.pid,
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
      sc.course.pid === course.pid ? { ...sc, sections } : sc,
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
    <div className="flex flex-col h-screen md:flex-row">
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
        <div className="flex">
          <button
            type="button"
            onClick={() => setMobileView("search")}
            className={`flex-1 flex flex-col items-center py-3 gap-1 ${mobileView === "search" ? "text-cyan-400" : "text-gray-400"
              }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs">Search</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView("calendar")}
            className={`flex-1 flex flex-col items-center py-3 gap-1 ${mobileView === "calendar" ? "text-cyan-400" : "text-gray-400"
              }`}
          >
            <CalendarIcon className="h-5 w-5" />
            <span className="text-xs">Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView("courses")}
            className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${mobileView === "courses" ? "text-cyan-400" : "text-gray-400"
              }`}
          >
            <List className="h-5 w-5" />
            <span className="text-xs">Courses</span>
            {selectedCourses.length > 0 && (
              <span className="absolute top-2 right-1/4 bg-cyan-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {selectedCourses.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Left Sidebar - Course Search */}
      <aside
        className={`
          ${mobileView === "search" ? "flex" : "hidden"}
          md:flex
          w-full md:w-80 bg-gray-900 text-white border-r border-gray-700 shrink-0 overflow-hidden
          flex-col pb-16 md:pb-0
        `}
      >
        <CourseSearch
          selectedTerm={selectedTerm}
          onTermChange={handleTermChange}
          onCourseSelect={handleCourseSelect}
        />
      </aside>

      {/* Main Calendar - Desktop: full calendar, Mobile: agenda view */}
      <main
        className={`
          ${mobileView === "calendar" ? "flex" : "hidden"}
          md:flex
          flex-1 overflow-hidden flex-col pb-16 md:pb-0
        `}
      >
        <div className="h-full bg-card text-card-foreground overflow-hidden flex flex-col">
          {/* Mobile: Agenda View */}
          <div className="md:hidden flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b bg-background flex items-center justify-between">
              <h2 className="font-semibold">Schedule</h2>
              <button
                type="button"
                onClick={handleShare}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Share
              </button>
            </div>
            <AgendaView events={events} />
          </div>

          {/* Desktop: Full Calendar */}
          <div className="hidden md:block h-full">
            <Calendar
              events={events}
              setEvents={setEvents}
              date={date}
              setDate={setDate}
              selectedTerm={selectedTerm}
              onShare={handleShare}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
        </div>
      </main>

      {/* Right Sidebar - Selected Courses */}
      <aside
        className={`
          ${mobileView === "courses" ? "flex" : "hidden"}
          ${sidebarOpen ? "md:flex" : "md:hidden"}
          w-full md:w-80 border-l border-gray-700 shrink-0 overflow-y-auto overflow-x-visible z-10
          flex-col pb-16 md:pb-0
        `}
      >
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
