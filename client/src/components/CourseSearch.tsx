import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { courseQueries } from "../lib/queries";
import { Search } from "lucide-react";

export function CourseSearch() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: courses, error, isLoading } = useQuery(courseQueries.search(searchTerm));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold mb-3">Course Search</h2>

        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by subject code..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && searchTerm && (
          <p className="text-gray-400 text-sm">Searching...</p>
        )}

        {error && (
          <div className="text-red-400 bg-red-900/30 p-3 rounded-md text-sm">
            Error: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {courses && courses.length === 0 && searchTerm && (
          <p className="text-gray-400 text-sm">No courses found</p>
        )}

        {courses && courses.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs mb-3">
              Found {courses.length} courses
            </p>
            <div className="space-y-2">
              {courses.map((course) => (
                <button
                  key={course.pid}
                  type="button"
                  className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                >
                  <div className="font-medium text-cyan-400 text-sm">
                    {course.subjectCode}
                  </div>
                  <div className="text-gray-300 text-xs mt-1 line-clamp-2">
                    {course.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!searchTerm && (
          <p className="text-gray-500 text-sm">
            Enter a subject code to search (e.g., CSC, MATH, PHYS)
          </p>
        )}
      </div>
    </div>
  );
}
