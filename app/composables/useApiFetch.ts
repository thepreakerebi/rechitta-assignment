import type { WatchSource } from 'vue'

/**
 * The app's one way of talking to the server.
 *
 * Two things every call needs, which is why this exists rather than reaching
 * for useFetch directly:
 *
 *  1. The mock scenario travels with the request. `?fail=server` on the page
 *     URL is meant to make the page fail, and it cannot do that unless the
 *     query reaches the API. Without this, every state is only reachable by
 *     hand-editing an API URL, which is the same as not being reachable.
 *
 *  2. Session-scoped content is fetched on the client, not rendered on the
 *     server. The shell paints immediately and the data arrives into a
 *     skeleton — which is both the right architecture for personalised content
 *     and the only way a loading state is ever actually seen.
 *
 * The options are deliberately a narrow subset rather than all of
 * UseFetchOptions: passing the full type through a generic wrapper defeats
 * useFetch's own inference and leaves `data` typed as unknown at every call
 * site.
 */
export interface ApiFetchOptions {
  readonly key?: string
  readonly immediate?: boolean
  readonly watch?: (WatchSource | object)[] | false
}

export const useApiFetch = <T>(
  url: string | (() => string),
  options: ApiFetchOptions = {},
) => {
  const route = useRoute()

  const query = computed(() => {
    const { fail, latency } = route.query
    return {
      ...(typeof fail === 'string' ? { fail } : {}),
      ...(typeof latency === 'string' ? { latency } : {}),
    }
  })

  return useFetch<T>(url, {
    lazy: true,
    server: false,
    query,
    key: options.key,
    immediate: options.immediate,
    watch: options.watch,
  })
}
