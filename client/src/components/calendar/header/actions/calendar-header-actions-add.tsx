import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function CalendarHeaderActionsAdd() {
  return (
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add Course
    </Button>
  );
}
