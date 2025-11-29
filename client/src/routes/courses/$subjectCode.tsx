import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { courseQueries } from "../../lib/queries";
import { PrerequisiteLinks } from "../../components/PrerequisiteLinks";

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-gray-500">Loading course...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-red-500">
          {error.message.includes("404")
            ? `Course "${subjectCode}" not found`
            : `Error: ${error.message}`}
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
            {course.subjectCode}
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
            <div className="text-gray-600">
              <PrerequisiteLinks text={course.preAndCorequisites} />
            </div>
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
