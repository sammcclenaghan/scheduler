import type { Course, Section } from "./types";

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
   * Search courses by subject code prefix.
   * @param query - The search query (e.g., "CSC1")
   */
  search: (query: string): Promise<Course[]> =>
    fetchJson<Course[]>(
      `${API_BASE}/search/courses?q=${encodeURIComponent(query)}`
    ),
};

/**
 * Sections API
 */
export const sectionsApi = {
  /**
   * List sections by course PID.
   * @param pid - The course PID
   */
  listByPid: (pid: string): Promise<Section[]> =>
    fetchJson<Section[]>(`${API_BASE}/sections/${pid}`),

  /**
   * List sections by course PID and term.
   * @param pid - The course PID
   * @param term - The term (e.g. "202501")
   */
  listByPidAndTerm: (pid: string, term: string): Promise<Section[]> =>
    fetchJson<Section[]>(`${API_BASE}/sections/${pid}/${term}`),
};


