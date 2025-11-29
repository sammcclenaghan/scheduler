import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Course Scheduler
      </h1>
      <p className="text-gray-600">
        Search for courses using the sidebar, then click on a course to view its sections.
      </p>
    </div>
  );
}
