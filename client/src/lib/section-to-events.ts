import type { Section } from "./types";
import type { CalendarEvent } from "@/components/calendar/calendar-types";
import { startOfWeek, addDays, setHours, setMinutes } from "date-fns";

const DAY_MAP: Record<string, number> = {
  M: 1, // Monday
  T: 2, // Tuesday
  W: 3, // Wednesday
  R: 4, // Thursday
  F: 5, // Friday
  S: 6, // Saturday
  U: 0, // Sunday
};

const COLORS = [
  { bg: "#3b82f6", text: "#ffffff" }, // blue
  { bg: "#10b981", text: "#ffffff" }, // emerald
  { bg: "#8b5cf6", text: "#ffffff" }, // violet
  { bg: "#f59e0b", text: "#000000" }, // amber
  { bg: "#ef4444", text: "#ffffff" }, // red
  { bg: "#ec4899", text: "#ffffff" }, // pink
  { bg: "#06b6d4", text: "#000000" }, // cyan
];

function parseTime(timeStr: string): { startHour: number; startMin: number; endHour: number; endMin: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;

  let startHour = parseInt(match[1], 10);
  const startMin = parseInt(match[2], 10);
  const startPeriod = match[3]?.toLowerCase();

  let endHour = parseInt(match[4], 10);
  const endMin = parseInt(match[5], 10);
  const endPeriod = match[6]?.toLowerCase();

  if (startPeriod === "pm" && startHour !== 12) startHour += 12;
  if (startPeriod === "am" && startHour === 12) startHour = 0;
  if (endPeriod === "pm" && endHour !== 12) endHour += 12;
  if (endPeriod === "am" && endHour === 12) endHour = 0;

  return { startHour, startMin, endHour, endMin };
}

function parseDays(daysStr: string): number[] {
  const days: number[] = [];
  for (const char of daysStr) {
    const day = DAY_MAP[char];
    if (day !== undefined) {
      days.push(day);
    }
  }
  return days;
}

export function sectionToEvents(
  section: Section,
  referenceDate: Date,
  colorIndex: number = 0
): CalendarEvent[] {
  const times = parseTime(section.time);
  if (!times) return [];

  const days = parseDays(section.days);
  if (days.length === 0) return [];

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const color = COLORS[colorIndex % COLORS.length];

  return days.map((dayOffset) => {
    const dayDate = addDays(weekStart, dayOffset);
    const start = setMinutes(setHours(dayDate, times.startHour), times.startMin);
    const end = setMinutes(setHours(dayDate, times.endHour), times.endMin);

    return {
      id: `${section.crn}-${dayOffset}`,
      title: `${section.subject} ${section.courseNumber}`,
      start,
      end,
      color: color.bg,
      textColor: color.text,
      section,
    };
  });
}

export interface GroupedSections {
  sections: {
    lectures: Section[];
    labs: Section[];
    tutorials: Section[];
    other: Section[];
  };
}

export function sectionsToEvents(
  sections: Section[],
  referenceDate: Date
): CalendarEvent[] {
  return sections.flatMap((section, index) => 
    sectionToEvents(section, referenceDate, index)
  );
}
