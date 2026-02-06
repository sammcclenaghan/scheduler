import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Info, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { courseQueries } from "../lib/queries";
import type { CourseSearchResult } from "../lib/types";

const TERMS = [
	{ code: "202509", label: "Fall 2025" },
	{ code: "202601", label: "Spring 2026" },
	{ code: "202605", label: "Summer 2026" },
];

interface CourseSearchProps {
	selectedTerm: string;
	onTermChange: (term: string) => void;
	onCourseSelect?: (result: CourseSearchResult, term: string) => void;
	isOpen: boolean;
	onToggle: () => void;
}

export function CourseSearch({
	selectedTerm,
	onTermChange,
	onCourseSelect,
	isOpen,
	onToggle,
}: CourseSearchProps) {
	const [query, setQuery] = useState("");
	const [searchTerm, setSearchTerm] = useState("");

	const {
		data: courses,
		error,
		isLoading,
	} = useQuery(courseQueries.search(searchTerm, selectedTerm));

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchTerm(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	if (!isOpen) {
		return (
			<>
				<div className="hidden h-full flex-col items-center py-4 md:flex">
					<button
						type="button"
						onClick={onToggle}
						className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
						title="Expand search"
					>
						<PanelLeftOpen className="h-5 w-5" />
					</button>
				</div>

				<div className="flex h-full w-full flex-col md:hidden">
					<FullSearchContent
						selectedTerm={selectedTerm}
						onTermChange={onTermChange}
						onCourseSelect={onCourseSelect}
						onToggle={onToggle}
						query={query}
						setQuery={setQuery}
						courses={courses}
						isLoading={isLoading}
						error={error}
						searchTerm={searchTerm}
					/>
				</div>
			</>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<FullSearchContent
				selectedTerm={selectedTerm}
				onTermChange={onTermChange}
				onCourseSelect={onCourseSelect}
				onToggle={onToggle}
				query={query}
				setQuery={setQuery}
				courses={courses}
				isLoading={isLoading}
				error={error}
				searchTerm={searchTerm}
			/>
		</div>
	);
}

function FullSearchContent({
	selectedTerm,
	onTermChange,
	onCourseSelect,
	onToggle,
	query,
	setQuery,
	courses,
	isLoading,
	error,
	searchTerm,
}: {
	selectedTerm: string;
	onTermChange: (term: string) => void;
	onCourseSelect?: (result: CourseSearchResult, term: string) => void;
	onToggle: () => void;
	query: string;
	setQuery: (q: string) => void;
	courses: CourseSearchResult[] | undefined;
	isLoading: boolean;
	error: Error | null;
	searchTerm: string;
}) {
	return (
		<>
			<div className="panel-header border-b border-border">
				<div>
					<h2 className="panel-title">Course Search</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Find and add classes quickly
					</p>
				</div>
				<button
					type="button"
					onClick={onToggle}
					className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:block"
					title="Collapse search"
				>
					<PanelLeftClose className="h-4 w-4" />
				</button>
			</div>

			<div className="space-y-4 border-b border-border px-5 py-5">
				<div className="flex flex-wrap gap-2">
					{TERMS.map((term) => {
						const className =
							selectedTerm === term.code
								? "chip chip-active"
								: "chip hover:bg-accent";
						return (
							<button
								key={term.code}
								type="button"
								onClick={() => onTermChange(term.code)}
								className={className}
							>
								{term.label}
							</button>
						);
					})}
				</div>

				<label className="relative block">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by subject, code, or title"
						className="input-field pl-9"
						aria-label="Search for courses"
					/>
				</label>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{isLoading && searchTerm && (
					<p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
						Searching...
					</p>
				)}

				{error && (
					<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
						Error: {error instanceof Error ? error.message : "Unknown error"}
					</div>
				)}

				{courses && courses.length === 0 && searchTerm && (
					<p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
						No courses found.
					</p>
				)}

				{!searchTerm && (
					<p className="rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
						Start typing to search UVic course offerings.
					</p>
				)}

				{courses && courses.length > 0 && (
					<div className="space-y-2">
						{courses.map((result) => (
							<article
								key={result.course.pid}
								className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/30"
							>
								<button
									type="button"
									onClick={() => onCourseSelect?.(result, selectedTerm)}
									className="w-full p-4 text-left"
								>
									<p className="text-[15px] font-semibold tracking-tight text-primary">
										{result.course.subjectCode}
									</p>
									<p className="mt-1.5 line-clamp-2 text-sm leading-6 text-foreground/85">
										{result.course.title}
									</p>
								</button>
								<div className="border-t border-border px-4 py-2.5">
									<Link
										to="/courses/$subjectCode"
										params={{ subjectCode: result.course.subjectCode }}
										className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-accent-foreground"
										title="View Course Details"
									>
										<Info className="h-3.5 w-3.5" />
										Course details
									</Link>
								</div>
							</article>
						))}
					</div>
				)}
			</div>
		</>
	);
}
