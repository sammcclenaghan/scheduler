import type { Course, CourseSearchResult } from "./types";
import type { GroupedSections } from "./section-to-events";

const API_BASE = "/api";

/**
 * Generic fetch wrapper with error handling and JSON parsing.
 */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${message}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Courses API
 */
export const coursesApi = {
  /**
   * Get a single course by ID.
   * @param id - The course ID
   */
  getCourse: (id: number): Promise<Course> =>
    fetchJson<Course>(`${API_BASE}/courses/${id}`),

  /**
   * Get a single course by subject code (e.g., "CSC115").
   * @param subjectCode - The course subject code
   */
  getCourseBySubjectCode: (subjectCode: string): Promise<Course> =>
    fetchJson<Course>(
      `${API_BASE}/courses/code/${encodeURIComponent(subjectCode)}`
    ),

  /**
   * Search courses by subject code prefix.
   * Returns courses with their default sections.
   * @param query - The search query (e.g., "CSC1")
   * @param term - Optional term filter (e.g., "202601")
   */
  search: (query: string, term?: string): Promise<CourseSearchResult[]> => {
    const params = new URLSearchParams({ q: query });
    if (term) {
      params.set("term", term);
    }
    return fetchJson<CourseSearchResult[]>(`${API_BASE}/search/courses?${params}`).then((data) => {
      console.log("API search response:", data);
      return data;
    });
  },
};

/**
 * Sections API
 */
export const sectionsApi = {
  /**
   * List sections by course PID.
   * @param pid - The course PID
   */
  listByPid: (pid: string): Promise<GroupedSections> =>
    fetchJson<GroupedSections>(`${API_BASE}/sections/${pid}`),

  /**
   * List sections by course PID and term.
   * @param pid - The course PID
   * @param term - The term (e.g. "202501")
   */
  listByPidAndTerm: (pid: string, term: string): Promise<GroupedSections> =>
    fetchJson<GroupedSections>(`${API_BASE}/sections/${pid}/${term}`),
};



