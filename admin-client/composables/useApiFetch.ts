import type { UseFetchOptions } from "#app";

export function useApiFetch<T>(url: string, options: UseFetchOptions<T> = {}) {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const baseURL = config.public.apiBase;

  return useFetch<T>(url, {
    baseURL,
    credentials: "include",
    ...options,
    onResponseError(ctx) {
      const status = ctx?.response?.status;
      const message =
        (ctx?.response?._data as any)?.message ||
        "Your session has expired. Please sign in again.";

      if (status === 401) {
        auth.clearSession();
        ElMessage?.warning?.(message);
        navigateTo("/login");
        return;
      }

      if (typeof options.onResponseError === "function") {
        // @ts-expect-error - allow user override even if types mismatch a bit
        options.onResponseError(ctx);
      }
    },
  });
}
