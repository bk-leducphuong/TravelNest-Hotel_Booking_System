import type { FilterField } from "~/utils/list-query";
import { parseListQuery, listApiParams } from "~/utils/list-query";

export function usePagedList<T>(
  permission: string,
  fields: FilterField[],
  fetcher: (
    params: Record<string, string | number>
  ) => Promise<{ data: T[]; meta: { total: number } }>,
  defaultLimit = 20,
  maxLimit = 100
) {
  const route = useRoute();
  const router = useRouter();
  const parsed = computed(() =>
    parseListQuery(route.query, fields, defaultLimit, maxLimit)
  );
  const draft = reactive<Record<string, string>>({ ...parsed.value.values });
  const validation = ref("");
  const { data, loading, error, load } = usePlatformResource(
    permission,
    () => route.fullPath,
    async () => {
      const q = parsed.value;
      if (q.error) return { data: [] as T[], meta: { total: 0 } };
      return fetcher(listApiParams(q.values, q.page, q.limit));
    }
  );
  const extras = () =>
    Object.fromEntries(
      Object.entries(route.query).filter(
        ([key]) =>
          !fields.some((field) => field.key === key) &&
          key !== "page" &&
          key !== "limit"
      )
    );
  watch(
    () => route.fullPath,
    () => {
      Object.assign(draft, parsed.value.values);
      validation.value = "";
    }
  );
  const apply = async () => {
    const checked = parseListQuery(
      { ...draft },
      fields,
      defaultLimit,
      maxLimit
    );
    validation.value = checked.error;
    if (checked.error) return;
    const query = {
      ...extras(),
      ...Object.fromEntries(
        Object.entries(checked.values).filter(([, v]) => v)
      ),
      limit: String(parsed.value.limit),
    };
    const target = router.resolve({ path: route.path, query }).fullPath;
    if (target === route.fullPath) await load();
    else await router.push({ path: route.path, query });
  };
  const clear = () => {
    Object.keys(draft).forEach((key) => {
      draft[key] = "";
    });
    validation.value = "";
    return router.push({ path: route.path, query: extras() });
  };
  const paginate = (page: number, limit = parsed.value.limit) =>
    router.push({
      path: route.path,
      query: { ...route.query, page: String(page), limit: String(limit) },
    });
  const rows = computed(() => data.value?.data ?? []);
  const total = computed(() => data.value?.meta.total ?? 0);
  const pageCount = computed(() =>
    Math.max(1, Math.ceil(total.value / parsed.value.limit))
  );
  return {
    rows,
    total,
    loading,
    error,
    load,
    draft,
    parsed,
    apply,
    clear,
    paginate,
    pageCount,
    validation: computed(() => validation.value || parsed.value.error),
    filtered: computed(() => Object.values(parsed.value.values).some(Boolean)),
    ready: computed(() => Boolean(data.value) && !parsed.value.error),
  };
}
