import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  className?: string;
}

export default function CalendarHeader({ className }: CalendarHeaderProps) {
  return <div className={cn("p-4 border-b bg-background", className)}></div>;
}
