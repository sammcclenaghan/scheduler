import { queryOptions } from "@tanstack/react-query";
import { coursesApi, sectionsApi, schedulesApi } from "./api";

/**
 * Query options for courses.
 * Use with useQuery, useSuspenseQuery, or prefetchQuery.
 */
export const courseQueries = {
  /**
   * Get a single course by ID.
   * @example
   * const { data } = useQuery(courseQueries.detail(123));
   */
  detail: (id: number) =>
    queryOptions({
      queryKey: ["courses", id],
      queryFn: () => coursesApi.getCourse(id),
    }),

  /**
   * Get a single course by subject code.
   * @example
   * const { data } = useQuery(courseQueries.bySubjectCode("CSC115"));
   */
  bySubjectCode: (subjectCode: string) =>
    queryOptions({
      queryKey: ["courses", "code", subjectCode],
      queryFn: () => coursesApi.getCourseBySubjectCode(subjectCode),
      enabled: subjectCode.length > 0,
    }),

  /**
   * Search courses by subject code prefix.
   * @example
   * const { data } = useQuery(courseQueries.search("CSC1"));
   * const { data } = useQuery(courseQueries.search("CSC1", "202601"));
   */
  search: (query: string, term?: string) =>
    queryOptions({
      queryKey: ["courses", "search", query, term],
      queryFn: () => coursesApi.search(query, term),
      enabled: query.length > 0,
    }),
};

/**
 * Query options for sections.
 */
export const sectionQueries = {
  /**
   * List sections by course PID.
   * @example
   * const { data } = useQuery(sectionQueries.byPid("CS101"));
   */
  byPid: (pid: string) =>
    queryOptions({
      queryKey: ["sections", pid],
      queryFn: () => sectionsApi.listByPid(pid),
    }),

  /**
   * List sections by course PID and term.
   * @example
   * const { data } = useQuery(sectionQueries.byPidAndTerm("CS101", "202501"));
   */
  byPidAndTerm: (pid: string, term: string) =>
    queryOptions({
      queryKey: ["sections", pid, term],
      queryFn: () => sectionsApi.listByPidAndTerm(pid, term),
    }),
};

/**
 * Query options for schedules.
 */
export const scheduleQueries = {
  /**
   * Get the schedule for a term.
   * @example
   * const { data } = useQuery(scheduleQueries.byTerm("202509"));
   */
  byTerm: (term: string) =>
    queryOptions({
      queryKey: ["schedules", term],
      queryFn: () => schedulesApi.get(term),
    }),
};

