import { ApiError } from "~/services/http";

export function usePlatformResource<T>(
  permission: string,
  key: () => string,
  fetcher: () => Promise<T>,
  retainOnRefresh = false
) {
  const auth = useAuthStore();
  const { can } = usePermissions();
  const begin = useRequestVersion();
  const data = shallowRef<T | null>(null);
  const loading = ref(false);
  const error = ref("");
  const load = async () => {
    const current = begin();
    if (!retainOnRefresh) data.value = null;
    error.value = "";
    if (!auth.isAuthenticated || !can(permission)) {
      data.value = null;
      loading.value = false;
      await navigateTo(auth.isAuthenticated ? "/403" : "/login");
      return;
    }
    loading.value = true;
    try {
      const result = await fetcher();
      if (current()) data.value = result;
    } catch (err) {
      if (!current()) return;
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        data.value = null;
        await navigateTo(err.status === 401 ? "/login" : "/403");
      } else {
        error.value =
          err instanceof ApiError && err.status === 404
            ? "errors.notFound"
            : err instanceof ApiError && err.status === 400
              ? "errors.invalidFilters"
              : err instanceof ApiError && err.status === 429
                ? "errors.rateLimited"
                : "errors.load";
      }
    } finally {
      if (current()) loading.value = false;
    }
  };
  watch(
    [
      key,
      () => auth.user?.id,
      () => auth.isAuthenticated,
      () => can(permission),
    ],
    () => {
      data.value = null;
      void load();
    },
    { immediate: true }
  );
  return { data, loading, error, load };
}
