import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarContext } from "../calendar-context";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  className?: string;
}

export default function CalendarHeader({ className }: CalendarHeaderProps) {
  const { onShare } = useCalendarContext();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    onShare?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("px-4 py-3 border-b bg-background flex items-center justify-end gap-2", className)}>
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
