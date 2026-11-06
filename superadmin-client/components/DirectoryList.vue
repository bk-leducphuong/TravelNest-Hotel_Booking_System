<script setup lang="ts">
import { fetchHotels, type HotelSummary } from "~/services/api/hotels";
import { fetchUsers, type UserSummary } from "~/services/api/users";
import { HOTEL_FILTERS, USER_FILTERS } from "~/utils/list-config";
import { statusTagType } from "~/utils/format";
const props = defineProps<{ kind: "hotels" | "users" }>();
const hotels = props.kind === "hotels";
const { can } = usePermissions();
const route = useRoute();
const { date, label } = usePlatformFormat();
const filters = hotels ? HOTEL_FILTERS : USER_FILTERS;
const list = usePagedList<HotelSummary | UserSummary>(
  hotels ? "platform.hotel.read" : "platform.user.read",
  filters,
  (params) => (hotels ? fetchHotels(params) : fetchUsers(params))
);
const {
  rows,
  total,
  loading,
  error,
  validation,
  draft,
  parsed,
  ready,
  filtered,
  pageCount,
  apply,
  clear,
  load,
  paginate,
} = list;
const displayRows = computed(() =>
  rows.value.map((row) => {
    const hotel = "hotelClass" in row ? row : null;
    const user = "globalRoles" in row ? row : null;
    return {
      id: row.id,
      title: hotel?.name ?? user?.fullName ?? user?.email ?? row.id,
      subtitle: hotel ? row.id : user?.email,
      status: row.status,
      createdAt: row.createdAt,
      location:
        [hotel?.city?.name, hotel?.country?.name].filter(Boolean).join(", ") ||
        "—",
      propertyClass: hotel?.hotelClass ?? "—",
      owner: hotel?.owner,
      roles: user?.globalRoles ?? [],
      lastLoginAt: user?.lastLoginAt,
    };
  })
);
</script>
<template>
  <div class="space-y-6">
    <UiPageHeader
      :title="$t(`nav.${kind}`)"
      :subtitle="
        $t(
          hotels ? 'directory.hotelsDescription' : 'directory.usersDescription'
        )
      "
    />
    <p class="text-xs text-muted">
      {{
        $t(
          can("platform.user.pii_read")
            ? "directory.piiVisible"
            : "directory.piiMasked"
        )
      }}
    </p>
    <UiListFilters
      :fields="filters"
      :values="draft"
      :error="validation"
      @update="(key, value) => (draft[key] = value)"
      @apply="apply"
      @clear="clear"
    />
    <UiReadState
      :loading="loading"
      :error="error"
      :empty="ready && !rows.length && parsed.page <= pageCount"
      :filtered="filtered"
      @retry="load"
    />
    <template v-if="ready && !loading && !error">
      <div v-if="rows.length" class="tn-section">
        <div
          class="tn-table-region"
          tabindex="0"
          role="region"
          :aria-label="$t('common.tableScroll')"
        >
          <table>
            <caption class="sr-only">
              {{
                $t(`nav.${kind}`)
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  {{ $t(hotels ? "fields.hotel" : "fields.user") }}
                </th>
                <th scope="col">{{ $t("fields.status") }}</th>
                <th v-if="hotels" scope="col">{{ $t("fields.location") }}</th>
                <th v-if="hotels" scope="col">{{ $t("fields.class") }}</th>
                <th scope="col">
                  {{ $t(hotels ? "fields.owner" : "fields.roles") }}
                </th>
                <th scope="col">
                  {{ $t(hotels ? "fields.created" : "fields.joined") }}
                </th>
                <th v-if="!hotels" scope="col">{{ $t("fields.lastLogin") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in displayRows" :key="row.id">
                <td>
                  <NuxtLink
                    :to="{
                      path: `/${kind}/${row.id}`,
                      query: { back: route.fullPath },
                    }"
                    class="font-medium"
                    >{{ row.title }}</NuxtLink
                  >
                  <p class="mt-1 text-xs text-muted">{{ row.subtitle }}</p>
                </td>
                <td>
                  <UiStatusPill :tone="statusTagType(row.status)">{{
                    label("status", row.status)
                  }}</UiStatusPill>
                </td>
                <td v-if="hotels">{{ row.location }}</td>
                <td v-if="hotels">{{ row.propertyClass }}</td>
                <td v-if="hotels">
                  <NuxtLink
                    v-if="row.owner && can('platform.user.read')"
                    :to="`/users/${row.owner.id}`"
                    >{{ row.owner.email }}</NuxtLink
                  ><span v-else>{{ row.owner?.email || "—" }}</span>
                </td>
                <td v-else>
                  <div class="flex flex-wrap gap-1">
                    <UiStatusPill v-for="role in row.roles" :key="role">{{
                      label("roles", role)
                    }}</UiStatusPill
                    ><span v-if="!row.roles.length">—</span>
                  </div>
                </td>
                <td>{{ date(row.createdAt) }}</td>
                <td v-if="!hotels">{{ date(row.lastLoginAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div
        v-else-if="parsed.page > pageCount"
        class="tn-section space-y-3"
        role="status"
      >
        <p>{{ $t("common.outOfRange") }}</p>
        <el-button @click="paginate(pageCount)">{{
          $t("common.lastPage")
        }}</el-button>
      </div>
      <UiListPagination
        :page="parsed.page"
        :pages="pageCount"
        :limit="parsed.limit"
        :total="total"
        @change="paginate"
      />
    </template>
  </div>
</template>
