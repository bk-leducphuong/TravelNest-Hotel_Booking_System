import type { UseFetchOptions } from "#app";

export function useApiFetch<T>(url: string, options: UseFetchOptions<T> = {}) {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const baseURL = config.public.apiBase;

  return useFetch(url, {
    baseURL,
    credentials: "include",
    ...options,
    onResponseError(ctx) {
      const status = ctx?.response?.status;
      const message =
        (ctx?.response?._data as { message?: string } | undefined)?.message ||
        "Your session has expired. Please sign in again.";

      if (status === 401) {
        auth.reset();
        ElMessage?.warning?.(message);
        navigateTo("/login");
        return;
      }

      if (typeof options.onResponseError === "function") {
        options.onResponseError(ctx);
      }
    },
  });
}
