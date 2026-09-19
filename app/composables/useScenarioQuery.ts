/**
 * The mock scenario, carried from the page URL onto every request.
 *
 * `?fail=server` on a page is meant to make that page fail, and it cannot do
 * that unless the query reaches the API. Extracted from useApiFetch because the
 * POSTs need it too, and a state that is only reachable from a GET is only half
 * reachable.
 */
export interface ScenarioQuery {
  readonly fail?: string
  readonly latency?: string
}

export const useScenarioQuery = () => {
  const route = useRoute()

  return computed<ScenarioQuery>(() => {
    const { fail, latency } = route.query
    return {
      ...(typeof fail === 'string' ? { fail } : {}),
      ...(typeof latency === 'string' ? { latency } : {}),
    }
  })
}
