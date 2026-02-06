import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<section className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
			<div
				className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70"
				aria-hidden="true"
			/>
			<div
				className="pointer-events-none absolute -left-20 top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl"
				aria-hidden="true"
			/>

			<div className="relative flex h-full items-start justify-start">
				<div className="max-w-3xl pt-4 sm:pt-8">
					<p className="chip mb-5 w-fit">Built for UVic students</p>
					<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
						Build a class schedule you can actually live with.
					</h1>
					<p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
						Find courses, test sections, and lock in a weekly plan before
						registration opens.
					</p>

					<div className="mt-8">
						<Link
							to="/schedule"
							className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/92"
						>
							Start Planning
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
