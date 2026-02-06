import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCalendarContext } from "../calendar-context";

interface CalendarHeaderProps {
	className?: string;
}

export default function CalendarHeader({ className }: CalendarHeaderProps) {
	const { onShare, date, setDate } = useCalendarContext();
	const [copied, setCopied] = useState(false);

	const monday = addDays(startOfWeek(date), 1);
	const friday = addDays(monday, 4);

	const handleShare = async () => {
		onShare?.();
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 border-b border-border bg-background px-5 py-4",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => setDate(addWeeks(date, -1))}
				>
					<ChevronLeft className="h-4 w-4" />
					<span className="sr-only">Previous week</span>
				</Button>
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => setDate(addWeeks(date, 1))}
				>
					<ChevronRight className="h-4 w-4" />
					<span className="sr-only">Next week</span>
				</Button>
				<Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
					Today
				</Button>
			</div>

			<p className="text-[15px] font-semibold tracking-tight text-foreground">
				{format(monday, "MMM d")} - {format(friday, "MMM d")}
			</p>

			<Button
				variant="outline"
				size="sm"
				onClick={handleShare}
				className="gap-1.5"
			>
				{copied ? (
					<>
						<Check className="h-3.5 w-3.5" />
						Copied
					</>
				) : (
					<>
						<Share2 className="h-3.5 w-3.5" />
						Share
					</>
				)}
			</Button>
		</div>
	);
}
