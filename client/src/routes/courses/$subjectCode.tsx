import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PrerequisiteLinks } from "../../components/PrerequisiteLinks";
import { courseQueries } from "../../lib/queries";

export const Route = createFileRoute("/courses/$subjectCode")({
	component: CourseBySubjectCode,
});

function CourseBySubjectCode() {
	const { subjectCode } = Route.useParams();

	const {
		data: course,
		isLoading,
		error,
	} = useQuery(courseQueries.bySubjectCode(subjectCode));

	if (isLoading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center px-4">
				<p className="text-sm font-medium text-muted-foreground">
					Loading course details...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center px-4">
				<p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error.message.includes("404")
						? `Course "${subjectCode}" not found`
						: `Error: ${error.message}`}
				</p>
			</div>
		);
	}

	if (!course) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center px-4">
				<p className="text-sm font-medium text-muted-foreground">
					Course not found
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
			<article className="panel p-6 sm:p-8">
				<div className="mb-5 flex items-center justify-between gap-3">
					<span className="chip chip-active">{course.subjectCode}</span>
					<span className="text-xs text-muted-foreground">
						PID {course.pid}
					</span>
				</div>

				<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{course.title}
				</h1>

				{course.description && (
					<section className="mt-7">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Description
						</h2>
						<p className="mt-2 text-sm leading-7 text-foreground/90 sm:text-base">
							{course.description}
						</p>
					</section>
				)}

				{course.preAndCorequisites && (
					<section className="mt-7">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Prerequisites and Corequisites
						</h2>
						<div className="mt-2 text-sm leading-7 text-foreground/90 sm:text-base">
							<PrerequisiteLinks text={course.preAndCorequisites} />
						</div>
					</section>
				)}

				{course.hoursCatalogText && (
					<section className="mt-7">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Hours
						</h2>
						<p className="mt-2 text-sm leading-7 text-foreground/90 sm:text-base">
							{course.hoursCatalogText}
						</p>
					</section>
				)}

				{course.notes && (
					<section className="mt-7">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Notes
						</h2>
						<p className="mt-2 text-sm leading-7 text-foreground/90 sm:text-base">
							{course.notes}
						</p>
					</section>
				)}
			</article>
		</div>
	);
}
