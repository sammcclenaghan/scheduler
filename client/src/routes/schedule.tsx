import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, List, Search, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CourseSearch } from "../components/CourseSearch";
import AgendaView from "../components/calendar/agenda-view";
import Calendar from "../components/calendar/calendar";
import type { CalendarEvent } from "../components/calendar/calendar-types";
import {
	type SelectedCourse,
	SelectedCoursesSidebar,
} from "../components/SelectedCoursesSidebar";
import { Button } from "../components/ui/button";
import { schedulesApi } from "../lib/api";
import { sectionsToEvents } from "../lib/section-to-events";
import {
	getOwnToken,
	getShareableUrl,
	getSharedToken,
	getTerm,
	setTerm,
} from "../lib/token";
import type { Course, CourseSearchResult, Section } from "../lib/types";

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
	const [date, setDate] = useState(new Date());
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
	const [selectedTerm, setSelectedTermState] = useState(() => getTerm());
	const [mobileView, setMobileView] = useState<MobileView>("calendar");
	const [searchSidebarOpen, setSearchSidebarOpen] = useState(true);
	const [reloadTrigger, setReloadTrigger] = useState(0);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlTermParam = params.get("term");
		const sharedToken = getSharedToken();
		const ownToken = getOwnToken();

		if (urlTermParam) {
			setSelectedTermState(urlTermParam);
			setTerm(urlTermParam);
		}

		const termToUse = urlTermParam || getTerm();

		if (sharedToken && sharedToken !== ownToken) {
			schedulesApi
				.join(termToUse, sharedToken)
				.then(() => {
					setReloadTrigger((n) => n + 1);
				})
				.catch(console.error);
		}
	}, []);

	const setSelectedTerm = (term: string) => {
		setTerm(term);
		setSelectedTermState(term);
	};

	const saveMutation = useMutation({
		mutationFn: (crns: string[]) => schedulesApi.save(selectedTerm, crns),
	});

	const saveSchedule = useCallback(
		(courses: SelectedCourse[]) => {
			const allCrns = courses.flatMap((sc) => sc.sections.map((s) => s.crn));
			saveMutation.mutate(allCrns);
		},
		[saveMutation],
	);

	useEffect(() => {
		const refreshKey = reloadTrigger;
		const loadSchedule = async () => {
			void refreshKey;
			try {
				const scheduleResponse = await schedulesApi.get(selectedTerm);
				if (scheduleResponse.sectionCrns.length === 0) {
					setSelectedCourses([]);
					setEvents([]);
					return;
				}

				const sectionsResponse = await fetch(
					`/api/sections/by-crns/${selectedTerm}?crns=${scheduleResponse.sectionCrns.join(",")}`,
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
					courseMap.get(key)?.sections.push(section);
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

				const allEvents: CalendarEvent[] = [];
				newSelectedCourses.forEach((sc, colorIndex) => {
					const newEvents = sectionsToEvents(
						sc.sections,
						new Date(),
						colorIndex,
					);
					allEvents.push(...newEvents);
				});
				setEvents(allEvents);
			} finally {
			}
		};

		loadSchedule();
	}, [selectedTerm, reloadTrigger]);

	const handleTermChange = (term: string) => {
		setSelectedTerm(term);
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

	const searchButtonClass =
		mobileView === "search" ? "nav-pill nav-pill-active" : "nav-pill";
	const calendarButtonClass =
		mobileView === "calendar" ? "nav-pill nav-pill-active" : "nav-pill";
	const coursesButtonClass =
		mobileView === "courses" ? "nav-pill nav-pill-active" : "nav-pill";

	return (
		<div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:flex-row md:gap-3 md:bg-muted/55 lg:gap-4">
			<nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/98 p-2 backdrop-blur md:hidden">
				<div className="mx-auto grid max-w-md grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => setMobileView("search")}
						className={searchButtonClass}
					>
						<Search className="h-4 w-4" />
						Search
					</button>
					<button
						type="button"
						onClick={() => setMobileView("calendar")}
						className={calendarButtonClass}
					>
						<CalendarIcon className="h-4 w-4" />
						Schedule
					</button>
					<button
						type="button"
						onClick={() => setMobileView("courses")}
						className={coursesButtonClass}
					>
						<List className="h-4 w-4" />
						Courses
						{selectedCourses.length > 0 && (
							<span className="absolute right-2 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
								{selectedCourses.length}
							</span>
						)}
					</button>
				</div>
			</nav>

			<aside
				className={`${mobileView === "search" ? "flex" : "hidden"} md:flex w-full flex-col overflow-hidden bg-surface pb-20 transition-[width] duration-200 md:pb-0 ${
					searchSidebarOpen ? "md:w-[22rem]" : "md:w-14"
				}`}
			>
				<CourseSearch
					selectedTerm={selectedTerm}
					onTermChange={handleTermChange}
					onCourseSelect={handleCourseSelect}
					isOpen={searchSidebarOpen}
					onToggle={() => setSearchSidebarOpen(!searchSidebarOpen)}
				/>
			</aside>

			<main
				className={`${mobileView === "calendar" ? "flex" : "hidden"} md:flex min-w-0 flex-1 flex-col overflow-hidden pb-20 md:rounded-xl md:border md:border-border/85 md:bg-card md:pb-0 md:shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}
			>
				<div className="h-full min-h-0 overflow-hidden">
					<div className="md:hidden border-b border-border bg-background px-4 py-3">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-semibold tracking-tight text-foreground">
								Weekly Schedule
							</p>
							<Button variant="outline" size="sm" onClick={handleShare}>
								<Share2 className="h-3.5 w-3.5" />
								Share
							</Button>
						</div>
					</div>
					<div className="md:hidden flex-1 overflow-hidden">
						<AgendaView events={events} />
					</div>

					<div className="hidden h-full min-h-0 md:block">
						<Calendar
							events={events}
							setEvents={setEvents}
							date={date}
							setDate={setDate}
							selectedTerm={selectedTerm}
							onShare={handleShare}
						/>
					</div>
				</div>
			</main>

			<aside
				className={`${mobileView === "courses" ? "flex" : "hidden"} md:flex w-full flex-col overflow-hidden bg-surface pb-20 md:w-[24rem] md:pb-0`}
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
