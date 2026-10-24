import type { Ref } from "vue";

export function useHotelSummary<T>(
  permission: string,
  fetcher: (hotelId: string) => Promise<T>
) {
  const auth = useAuthStore();
  const { can } = usePermissions();
  const data = shallowRef<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref("");
  const requests = useRequestVersion();
  const reload = async () => {
    const current = requests.begin();
    data.value = null;
    error.value = "";
    loading.value = false;
    if (!auth.activeHotelId || !can(permission)) return;
    loading.value = true;
    try {
      const result = await fetcher(auth.activeHotelId);
      if (current()) data.value = result;
    } catch (failure) {
      if (current()) error.value = (failure as Error).message;
    } finally {
      if (current()) loading.value = false;
    }
  };
  watch([() => auth.activeHotelId, () => can(permission)], reload, {
    immediate: true,
  });
  return { data, loading, error, reload };
}
