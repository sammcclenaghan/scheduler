import { Link } from "@tanstack/react-router";

const navLinkClass =
	"rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

export default function Header() {
	return (
		<header className="border-b border-border/90 bg-background/95 backdrop-blur">
			<div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6">
				<Link to="/" className="inline-flex items-center gap-2">
					<span className="status-dot bg-primary" />
					<div>
						<p className="text-sm font-semibold tracking-tight text-foreground">
							UVic Course Scheduler
						</p>
						<p className="text-xs text-muted-foreground">
							University of Victoria
						</p>
					</div>
				</Link>

				<nav className="flex items-center gap-1">
					<Link
						to="/"
						className={navLinkClass}
						activeProps={{
							className: `${navLinkClass} bg-accent text-accent-foreground`,
						}}
					>
						Home
					</Link>
					<Link
						to="/schedule"
						className={navLinkClass}
						activeProps={{
							className: `${navLinkClass} bg-accent text-accent-foreground`,
						}}
					>
						Schedule
					</Link>
				</nav>
			</div>
		</header>
	);
}
