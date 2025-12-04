import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronRight, Calendar, Clock, User } from "lucide-react";
import { Button } from "./ui/button";
import { sectionQueries } from "../lib/queries";
import type { Course, Section } from "../lib/types";

interface SelectedCourse {
  course: Course;
  sections: Section[];
  term: string;
}

interface SelectedCoursesSidebarProps {
  selectedCourses: SelectedCourse[];
  onCourseRemove: (course: Course) => void;
  onSectionsUpdate: (course: Course, sections: Section[]) => void;
  onClearAll: () => void;
}

export function SelectedCoursesSidebar({
  selectedCourses,
  onCourseRemove,
  onSectionsUpdate,
  onClearAll,
}: SelectedCoursesSidebarProps) {
  const [expandedCourseKey, setExpandedCourseKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-x-visible">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold">Selected Courses</h2>
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearAll}
          disabled={selectedCourses.length === 0}
        >
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-visible p-4">
        {selectedCourses.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No courses selected. Search and click a course to add it.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs mb-3">
              {selectedCourses.length} course
              {selectedCourses.length !== 1 && "s"} selected
            </p>
            {selectedCourses.map((selected) => {
              const courseKey = `${selected.course.pid}-${selected.term}`;
              return (
                <CourseCard
                  key={courseKey}
                  selectedCourse={selected}
                  isExpanded={expandedCourseKey === courseKey}
                  onToggleExpand={() =>
                    setExpandedCourseKey((prev) =>
                      prev === courseKey ? null : courseKey,
                    )
                  }
                  onRemove={() => onCourseRemove(selected.course)}
                  onSectionsUpdate={(sections) =>
                    onSectionsUpdate(selected.course, sections)
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface CourseCardProps {
  selectedCourse: SelectedCourse;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onSectionsUpdate: (sections: Section[]) => void;
}

function CourseCard({
  selectedCourse,
  isExpanded,
  onToggleExpand,
  onRemove,
  onSectionsUpdate,
}: CourseCardProps) {
  const { course, sections, term } = selectedCourse;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div
        className="p-3 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ChevronRight
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
              <span className="font-medium text-cyan-400 text-sm">
                {course.subjectCode}
              </span>
            </div>
            <p className="text-gray-300 text-xs mt-1 line-clamp-1 ml-6">
              {course.title}
            </p>
            <div className="flex gap-2 text-xs text-gray-500 mt-1 ml-6">
              <span>{course.credits} credits</span>
              {sections.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {sections.length} section{sections.length !== 1 && "s"}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <SectionSelector
          course={course}
          term={term}
          currentSections={sections}
          onSectionsUpdate={onSectionsUpdate}
        />
      )}
    </div>
  );
}

interface SectionSelectorProps {
  course: Course;
  term: string;
  currentSections: Section[];
  onSectionsUpdate: (sections: Section[]) => void;
}

function SectionSelector({
  course,
  term,
  currentSections,
  onSectionsUpdate,
}: SectionSelectorProps) {
  const { data: allSections, isLoading } = useQuery(
    sectionQueries.byPidAndTerm(course.pid, term),
  );

  if (isLoading) {
    return (
      <div className="px-3 pb-3 border-t border-gray-700">
        <p className="text-gray-400 text-xs py-2">Loading sections...</p>
      </div>
    );
  }

  if (!allSections) {
    return (
      <div className="px-3 pb-3 border-t border-gray-700">
        <p className="text-gray-400 text-xs py-2">No sections available</p>
      </div>
    );
  }

  const { sections: grouped } = allSections;
  const hasAnySections =
    grouped.lectures.length > 0 ||
    grouped.labs.length > 0 ||
    grouped.tutorials.length > 0 ||
    grouped.other.length > 0;

  if (!hasAnySections) {
    return (
      <div className="px-3 pb-3 border-t border-gray-700">
        <p className="text-gray-400 text-xs py-2">No sections available</p>
      </div>
    );
  }

  const sectionGroups: { label: string; type: string; sections: Section[] }[] =
    [
      { label: "Lectures", type: "Lecture", sections: grouped.lectures },
      { label: "Labs", type: "Lab", sections: grouped.labs },
      { label: "Tutorials", type: "Tutorial", sections: grouped.tutorials },
      { label: "Other", type: "Other", sections: grouped.other },
    ].filter((g) => g.sections.length > 0);

  const currentSectionCrns = new Set(currentSections.map((s) => s.crn));

  const handleSectionToggle = (section: Section, type: string) => {
    const otherTypeSections = currentSections.filter(
      (s) => s.scheduleType !== type,
    );

    if (currentSectionCrns.has(section.crn)) {
      onSectionsUpdate(otherTypeSections);
    } else {
      onSectionsUpdate([...otherTypeSections, section]);
    }
  };

  return (
    <div className="px-3 pb-3 border-t border-gray-700 space-y-3">
      {sectionGroups.map(({ label, type, sections }) => (
        <div key={type} className="pt-2">
          <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
          <div className="space-y-1">
            {sections.map((section) => {
              const isSelected = currentSectionCrns.has(section.crn);
              return (
                <div key={section.crn} className="relative group">
                  <Tooltip content={section.additionalInformation}>
                    <button
                      type="button"
                      onClick={() => handleSectionToggle(section, type)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_0_1px_rgba(6,182,212,0.3)]"
                          : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <div className="mb-2.5 flex justify-between items-start">
                        <span
                          className={`text-sm font-bold ${isSelected ? "text-cyan-100" : "text-gray-100"}`}
                        >
                          {section.section}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-medium">{section.days}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{section.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span>Seats</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                section.enrollmentSeatsAvailable > 0
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {section.enrollmentActual}/
                              {section.enrollmentMaximum}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>Waitlist</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                section.waitlistActual > 0
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              {section.waitlistActual}/
                              {section.waitlistCapacity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  if (!content) return <>{children}</>;

  return (
    <div
      className="w-full"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left - 264, // w-64 (256px) + mr-2 (8px)
        });
      }}
      onMouseLeave={() => setCoords(null)}
    >
      {children}
      {coords &&
        createPortal(
          <div
            className="fixed z-[100] w-64 p-2 bg-gray-800 border border-gray-600 rounded-md text-xs text-gray-200 shadow-lg pointer-events-none"
            style={{
              top: coords.top,
              left: coords.left,
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}

export type { SelectedCourse };
