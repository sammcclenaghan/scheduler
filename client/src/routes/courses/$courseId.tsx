import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { courseQueries } from "../../lib/queries";

export const Route = createFileRoute("/courses/$courseId")({
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const id = Number(courseId);

  const {
    data: course,
    isLoading,
    error,
  } = useQuery(courseQueries.detail(id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-gray-500">Loading course...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-red-500">
          Error: {error.message}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-gray-500">Course not found</div>
      </div>
    );
  }

  // `course` is fully typed as Course here!
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
            {course.subjectCode}
          </span>
          <span className="ml-2 text-sm text-gray-500">
            {course.credits} credits
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {course.title}
        </h1>

        <p className="text-sm text-gray-500 mb-6">PID: {course.pid}</p>

        {course.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Description
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {course.description}
            </p>
          </div>
        )}

        {course.preAndCorequisites && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Prerequisites & Corequisites
            </h2>
            <p className="text-gray-600">{course.preAndCorequisites}</p>
          </div>
        )}

        {course.hoursCatalogText && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Hours
            </h2>
            <p className="text-gray-600">{course.hoursCatalogText}</p>
          </div>
        )}

        {course.notes && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Notes
            </h2>
            <p className="text-gray-600">{course.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

