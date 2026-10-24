import {
  activeDestination,
  groupDestinations,
  visibleDestinations,
} from "~/utils/navigation";

export function useAdminNavigation() {
  const { can } = usePermissions();
  const route = useRoute();
  const destinations = computed(() => visibleDestinations(can));
  const groups = computed(() => groupDestinations(destinations.value));
  const active = computed(() =>
    activeDestination(route.path, destinations.value)
  );
  return { destinations, groups, active };
}
