import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { courseQueries } from "../lib/queries";
import type { CourseSearchResult } from "../lib/types";

const TERMS = [
  { code: "202509", label: "Fall 2025" },
  { code: "202601", label: "Spring 2026" },
  { code: "202605", label: "Summer 2026" },
];

interface CourseSearchProps {
  selectedTerm: string;
  onTermChange: (term: string) => void;
  onCourseSelect?: (result: CourseSearchResult, term: string) => void;
}

export function CourseSearch({
  selectedTerm,
  onTermChange,
  onCourseSelect,
}: CourseSearchProps) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: courses,
    error,
    isLoading,
  } = useQuery(courseQueries.search(searchTerm, selectedTerm));

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold mb-3">Course Search</h2>

        <div className="flex gap-2 mb-3">
          {TERMS.map((term) => (
            <button
              key={term.code}
              type="button"
              onClick={() => onTermChange(term.code)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedTerm === term.code
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
                }`}
            >
              {term.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by subject code (e.g., CSC, CSC 230)..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
        />
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
              {courses.map((result) => (
                <div
                  key={result.course.pid}
                  className="group flex items-center bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => onCourseSelect?.(result, selectedTerm)}
                    className="flex-1 text-left p-3 min-w-0"
                  >
                    <div className="font-medium text-cyan-400 text-sm">
                      {result.course.subjectCode}
                    </div>
                    <div className="text-gray-300 text-xs mt-1 line-clamp-2">
                      {result.course.title}
                    </div>
                  </button>
                  <Link
                    to="/courses/$subjectCode"
                    params={{ subjectCode: result.course.subjectCode }}
                    className="p-3 text-gray-400 hover:text-cyan-400 hover:bg-gray-600 transition-colors border-l border-gray-700"
                    title="View Course Details"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                </div>
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
