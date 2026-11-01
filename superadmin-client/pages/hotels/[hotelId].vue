<script setup lang="ts">
import { fetchHotel } from "~/services/api/hotels";
import { safeDirectoryBack } from "~/utils/list-query";
import { statusTagType } from "~/utils/format";
const route = useRoute();
const { t } = useI18n();
const { can } = usePermissions();
const { date, number, label } = usePlatformFormat();
const {
  data: hotel,
  loading,
  error,
  load,
} = usePlatformResource(
  "platform.hotel.read",
  () => String(route.params.hotelId),
  () => fetchHotel(String(route.params.hotelId))
);
const back = computed(() => safeDirectoryBack(route.query.back, "/hotels"));
const fields = computed(() =>
  hotel.value
    ? [
        { label: t("fields.hotelId"), value: hotel.value.id },
        {
          label: t("fields.owner"),
          value: hotel.value.owner?.email,
          to:
            hotel.value.owner && can("platform.user.read")
              ? `/users/${hotel.value.owner.id}`
              : undefined,
        },
        { label: t("fields.address"), value: hotel.value.address },
        { label: t("fields.phone"), value: hotel.value.phoneNumber },
        { label: t("fields.timezone"), value: hotel.value.timezone },
        { label: t("fields.class"), value: hotel.value.hotelClass },
        {
          label: t("fields.coordinates"),
          value:
            hotel.value.latitude != null && hotel.value.longitude != null
              ? `${hotel.value.latitude}, ${hotel.value.longitude}`
              : null,
        },
        { label: t("fields.created"), value: date(hotel.value.createdAt) },
      ]
    : []
);
</script>
<template>
  <div class="space-y-6">
    <NuxtLink :to="back" class="text-sm underline underline-offset-4"
      >← {{ $t("common.backHotels") }}</NuxtLink
    >
    <UiPageHeader v-if="loading || error" :title="$t('nav.hotels')" />
    <UiReadState :loading="loading" :error="error" @retry="load" />
    <template v-if="hotel && !loading && !error">
      <UiPageHeader
        :title="hotel.name"
        :subtitle="
          [hotel.city?.name, hotel.country?.name].filter(Boolean).join(', ')
        "
        ><template #actions
          ><UiStatusPill :tone="statusTagType(hotel.status)">{{
            label("status", hotel.status)
          }}</UiStatusPill></template
        ></UiPageHeader
      >
      <p class="text-xs text-muted">{{ $t("directory.countsScope") }}</p>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UiStatCard
          :label="$t('fields.rooms')"
          :value="number(hotel.counts.rooms)"
        />
        <UiStatCard
          :label="$t('fields.bookings')"
          :value="number(hotel.counts.bookings)"
        />
        <UiStatCard
          :label="$t('fields.reviews')"
          :value="number(hotel.counts.reviews)"
        />
        <UiStatCard
          :label="$t('fields.rating')"
          :value="hotel.rating ? `${number(hotel.rating.overall)}/10` : '—'"
          :hint="
            hotel.rating
              ? $t('fields.ratingCount', { count: number(hotel.rating.total) })
              : undefined
          "
        />
      </div>
      <UiSectionCard :title="$t('directory.hotelInfo')"
        ><UiDetailFields :fields="fields" />
        <p v-if="hotel.description" class="mt-6 whitespace-pre-wrap text-sm">
          {{ hotel.description }}
        </p></UiSectionCard
      >
      <p class="text-xs text-muted">
        {{
          $t(
            can("platform.user.pii_read")
              ? "directory.piiVisible"
              : "directory.piiMasked"
          )
        }}
      </p>
      <UiSectionCard :title="$t('directory.team')">
        <p v-if="!hotel.members.length" class="text-sm text-muted">
          {{ $t("directory.noTeam") }}
        </p>
        <div
          v-else
          class="tn-table-region"
          tabindex="0"
          role="region"
          :aria-label="$t('directory.team')"
        >
          <table>
            <caption class="sr-only">
              {{
                $t("directory.team")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ $t("fields.email") }}</th>
                <th scope="col">{{ $t("fields.role") }}</th>
                <th scope="col">{{ $t("fields.primaryOwner") }}</th>
                <th scope="col">{{ $t("fields.joined") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in hotel.members" :key="member.userId">
                <td>
                  <NuxtLink
                    v-if="member.user && can('platform.user.read')"
                    :to="`/users/${member.userId}`"
                    >{{ member.user.email }}</NuxtLink
                  ><span v-else>{{ member.user?.email || "—" }}</span>
                </td>
                <td>{{ label("roles", member.role) }}</td>
                <td>
                  {{ $t(member.isPrimaryOwner ? "common.yes" : "common.no") }}
                </td>
                <td>{{ date(member.joinedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSectionCard>
    </template>
  </div>
</template>
