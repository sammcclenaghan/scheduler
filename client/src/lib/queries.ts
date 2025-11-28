import { queryOptions } from "@tanstack/react-query";
import { coursesApi, sectionsApi } from "./api";

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
   * Search courses by subject code prefix.
   * @example
   * const { data } = useQuery(courseQueries.search("CSC1"));
   */
  search: (query: string) =>
    queryOptions({
      queryKey: ["courses", "search", query],
      queryFn: () => coursesApi.search(query),
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



