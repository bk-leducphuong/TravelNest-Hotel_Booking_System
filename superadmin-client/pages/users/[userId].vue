<script setup lang="ts">
import { fetchUser } from "~/services/api/users";
import { safeDirectoryBack } from "~/utils/list-query";
import { statusTagType } from "~/utils/format";
const route = useRoute();
const { t } = useI18n();
const { can } = usePermissions();
const { date, number, label } = usePlatformFormat();
const {
  data: user,
  loading,
  error,
  load,
} = usePlatformResource(
  "platform.user.read",
  () => String(route.params.userId),
  () => fetchUser(String(route.params.userId))
);
const back = computed(() => safeDirectoryBack(route.query.back, "/users"));
const fields = computed(() =>
  user.value
    ? [
        { label: t("fields.id"), value: user.value.id },
        { label: t("fields.email"), value: user.value.email },
        { label: t("fields.phone"), value: user.value.phoneNumber },
        { label: t("fields.birthDate"), value: user.value.dateOfBirth },
        { label: t("fields.address"), value: user.value.address },
        { label: t("fields.joined"), value: date(user.value.createdAt) },
        { label: t("fields.lastLogin"), value: date(user.value.lastLoginAt) },
        {
          label: t("fields.verified"),
          value: date(user.value.emailVerifiedAt),
        },
      ]
    : []
);
</script>
<template>
  <div class="space-y-6">
    <NuxtLink :to="back" class="text-sm underline underline-offset-4"
      >← {{ $t("common.backUsers") }}</NuxtLink
    >
    <UiPageHeader v-if="loading || error" :title="$t('nav.users')" />
    <UiReadState :loading="loading" :error="error" @retry="load" />
    <template v-if="user && !loading && !error">
      <UiPageHeader :title="user.fullName || user.email" :subtitle="user.email"
        ><template #actions
          ><UiStatusPill :tone="statusTagType(user.status)">{{
            label("status", user.status)
          }}</UiStatusPill></template
        ></UiPageHeader
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
      <div class="tn-detail-grid">
        <UiSectionCard :title="$t('directory.profile')"
          ><UiDetailFields :fields="fields"
        /></UiSectionCard>
        <UiSectionCard :title="$t('directory.access')"
          ><h3 class="mb-3 text-sm text-muted">{{ $t("fields.roles") }}</h3>
          <div class="flex flex-wrap gap-2">
            <UiStatusPill v-for="role in user.globalRoles" :key="role">{{
              label("roles", role)
            }}</UiStatusPill
            ><span v-if="!user.globalRoles.length">—</span>
          </div>
          <p class="mb-2 mt-6 text-sm text-muted">
            {{ $t("fields.bookings") }}
          </p>
          <p class="text-3xl font-medium tabular-nums">
            {{ number(user.bookings.total) }}
          </p>
          <p class="mt-2 text-xs text-muted">
            {{ $t("directory.countsScope") }}
          </p></UiSectionCard
        >
      </div>
      <UiSectionCard :title="$t('directory.memberships')">
        <p v-if="!user.memberships.length" class="text-sm text-muted">
          {{ $t("directory.noMemberships") }}
        </p>
        <div
          v-else
          class="tn-table-region"
          tabindex="0"
          role="region"
          :aria-label="$t('directory.memberships')"
        >
          <table>
            <caption class="sr-only">
              {{
                $t("directory.memberships")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ $t("fields.hotel") }}</th>
                <th scope="col">{{ $t("fields.status") }}</th>
                <th scope="col">{{ $t("fields.role") }}</th>
                <th scope="col">{{ $t("fields.primaryOwner") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in user.memberships" :key="member.hotelId">
                <td>
                  <NuxtLink
                    v-if="can('platform.hotel.read')"
                    :to="`/hotels/${member.hotelId}`"
                    >{{ member.hotelName || member.hotelId }}</NuxtLink
                  ><span v-else>{{ member.hotelName || member.hotelId }}</span>
                </td>
                <td>{{ label("status", member.hotelStatus) }}</td>
                <td>{{ label("roles", member.role) }}</td>
                <td>
                  {{ $t(member.isPrimaryOwner ? "common.yes" : "common.no") }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSectionCard>
    </template>
  </div>
</template>
