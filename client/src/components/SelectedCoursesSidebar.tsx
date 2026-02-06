import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, Clock, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sectionQueries } from "../lib/queries";
import type { Course, Section } from "../lib/types";
import { Button } from "./ui/button";

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
	const [expandedCourseKey, setExpandedCourseKey] = useState<string | null>(
		null,
	);
	const prevCoursesLengthRef = useRef(selectedCourses.length);

	useEffect(() => {
		if (selectedCourses.length > prevCoursesLengthRef.current) {
			const newCourse = selectedCourses[selectedCourses.length - 1];
			const courseKey = `${newCourse.course.pid}-${newCourse.term}`;
			setExpandedCourseKey(courseKey);
		}
		prevCoursesLengthRef.current = selectedCourses.length;
	}, [selectedCourses]);

	return (
		<div className="flex h-full flex-col">
			<div className="panel-header">
				<div>
					<h2 className="panel-title">Selected Courses</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Manage sections and seat availability
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={onClearAll}
					disabled={selectedCourses.length === 0}
				>
					Clear
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{selectedCourses.length === 0 ? (
					<div className="rounded-lg border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted-foreground">
						No courses selected yet.
					</div>
				) : (
					<div className="space-y-3">
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
		<article className="overflow-hidden rounded-lg border border-border bg-card">
			<div className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-accent/60">
				<button
					type="button"
					className="min-w-0 flex-1 text-left"
					onClick={onToggleExpand}
				>
					<div className="flex items-center gap-2">
						<ChevronRight
							className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
						/>
						<span className="text-sm font-semibold tracking-tight text-primary">
							{course.subjectCode}
						</span>
					</div>
					<p className="mt-1.5 line-clamp-1 pl-6 text-sm leading-6 text-foreground/85">
						{course.title}
					</p>
					<p className="mt-1.5 pl-6 text-[13px] text-muted-foreground">
						{course.credits} credits
						{sections.length > 0 &&
							` · ${sections.length} section${sections.length === 1 ? "" : "s"}`}
					</p>
				</button>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
					aria-label="Remove course"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{isExpanded && (
				<SectionSelector
					course={course}
					term={term}
					currentSections={sections}
					onSectionsUpdate={onSectionsUpdate}
				/>
			)}
		</article>
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
			<div className="border-t border-border px-4 pb-4">
				<p className="py-2 text-xs text-muted-foreground">
					Loading sections...
				</p>
			</div>
		);
	}

	if (!allSections) {
		return (
			<div className="border-t border-border px-4 pb-4">
				<p className="py-2 text-xs text-muted-foreground">
					No sections available
				</p>
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
			<div className="border-t border-border px-4 pb-4">
				<p className="py-2 text-xs text-muted-foreground">
					No sections available
				</p>
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
		<div className="space-y-3 border-t border-border px-4 pb-4">
			{sectionGroups.map(({ label, type, sections }) => (
				<section key={type} className="pt-2">
					<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
						{label}
					</p>
					<div className="space-y-1.5">
						{sections.map((section) => {
							const isSelected = currentSectionCrns.has(section.crn);
							return (
								<div key={section.crn} className="relative group">
									<button
										type="button"
										onClick={() => handleSectionToggle(section, type)}
										title={section.additionalInformation || undefined}
										className={`w-full rounded-lg border p-3 text-left text-xs transition-all ${
											isSelected
												? "border-primary/35 bg-primary/10"
												: "border-border bg-surface hover:border-primary/20 hover:bg-accent/45"
										}`}
									>
										<div className="mb-2 flex items-start justify-between">
											<span className="text-sm font-semibold text-foreground">
												{section.section}
											</span>
											<span className="chip px-2 py-0.5 text-[10px]">
												CRN {section.crn}
											</span>
										</div>

										<div className="space-y-1.5 text-muted-foreground">
											<div className="flex items-center gap-4">
												<div className="flex items-center gap-1.5">
													<Calendar className="h-3.5 w-3.5 shrink-0" />
													<span className="font-medium">{section.days}</span>
												</div>
												<div className="flex items-center gap-1.5">
													<Clock className="h-3.5 w-3.5 shrink-0" />
													<span>{section.time}</span>
												</div>
											</div>

											<div className="flex flex-wrap items-center gap-2 text-[11px]">
												<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
													<User className="h-3 w-3" />
													Seats {section.enrollmentActual}/
													{section.enrollmentMaximum}
												</span>
												<SeatBadge section={section} />
												<WaitlistBadge section={section} />
											</div>
										</div>
									</button>
								</div>
							);
						})}
					</div>
				</section>
			))}
		</div>
	);
}

function SeatBadge({ section }: { section: Section }) {
	if (section.enrollmentSeatsAvailable > 0) {
		return (
			<span className="rounded-full bg-success/15 px-2 py-0.5 text-success-foreground">
				Open {section.enrollmentSeatsAvailable}
			</span>
		);
	}

	return (
		<span className="rounded-full bg-destructive/12 px-2 py-0.5 text-destructive">
			Full
		</span>
	);
}

function WaitlistBadge({ section }: { section: Section }) {
	if (section.waitlistActual > 0) {
		return (
			<span className="rounded-full bg-warning/20 px-2 py-0.5 text-warning-foreground">
				Waitlist {section.waitlistActual}/{section.waitlistCapacity}
			</span>
		);
	}

	return (
		<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
			Waitlist {section.waitlistActual}/{section.waitlistCapacity}
		</span>
	);
}

export type { SelectedCourse };
