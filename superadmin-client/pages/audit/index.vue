<script setup lang="ts">
import { fetchAudit, type AuditEntry } from "~/services/api/audit";
import { AUDIT_FILTERS } from "~/utils/list-config";
import type { RecordField } from "~/components/ui/RecordDrawer.vue";
const route = useRoute();
const { t } = useI18n();
const { can } = usePermissions();
const { date } = usePlatformFormat();
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
} = usePagedList("platform.audit.read", AUDIT_FILTERS, fetchAudit, 50, 200);
const selected = shallowRef<AuditEntry | null>(null);
watch([() => route.fullPath, loading, rows], () => {
  selected.value = null;
});
const recordFields = computed<RecordField[]>(() => {
  const row = selected.value;
  if (!row) return [];
  return [
    { label: t("fields.id"), value: row.id, copy: true },
    { label: t("fields.created"), value: date(row.createdAt) },
    { label: t("fields.action"), value: row.action },
    { label: t("fields.entityType"), value: row.entityType },
    { label: t("fields.entityId"), value: row.entityId, copy: true },
    { label: t("fields.actorType"), value: row.actorType },
    {
      label: t("fields.actorId"),
      value: row.actorUserId,
      copy: true,
      to:
        row.actorUserId && can("platform.user.read")
          ? `/users/${row.actorUserId}`
          : undefined,
    },
    {
      label: t("fields.hotelId"),
      value: row.hotelId,
      copy: true,
      to:
        row.hotelId && can("platform.hotel.read")
          ? `/hotels/${row.hotelId}`
          : undefined,
    },
    { label: t("fields.reason"), value: row.reason },
    { label: t("fields.requestId"), value: row.requestId, copy: true },
  ];
});
</script>
<template>
  <div class="space-y-6">
    <UiPageHeader :title="$t('nav.audit')" :subtitle="$t('audit.description')"
      ><template #actions
        ><el-button :loading="loading" @click="load">{{
          $t("common.refresh")
        }}</el-button></template
      ></UiPageHeader
    >
    <p class="text-xs text-muted">{{ $t("filters.creationDates") }}</p>
    <UiListFilters
      :fields="AUDIT_FILTERS"
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
                $t("nav.audit")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ $t("fields.created") }}</th>
                <th scope="col">{{ $t("fields.action") }}</th>
                <th scope="col">{{ $t("fields.entityType") }}</th>
                <th scope="col">{{ $t("fields.actorId") }}</th>
                <th scope="col">{{ $t("fields.reason") }}</th>
                <th scope="col">{{ $t("fields.inspect") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>{{ date(row.createdAt) }}</td>
                <td class="font-mono text-xs">{{ row.action }}</td>
                <td>
                  {{ row.entityType || "—" }}
                  <p class="mt-1 font-mono text-xs text-muted">
                    {{ row.entityId || "—" }}
                  </p>
                </td>
                <td>{{ row.actorUserId || row.actorType }}</td>
                <td>{{ row.reason || "—" }}</td>
                <td>
                  <button
                    type="button"
                    class="text-brand underline underline-offset-4"
                    :aria-label="$t('common.inspect', { id: row.id })"
                    @click="selected = row"
                  >
                    {{ $t("common.view") }}
                  </button>
                </td>
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
        :max-limit="200"
        @change="paginate"
      />
    </template>
    <UiRecordDrawer
      :open="Boolean(selected)"
      :title="$t('audit.recordTitle')"
      :fields="recordFields"
      :metadata="selected?.metadata"
      :description="$t('audit.metadataHint')"
      @close="selected = null"
    />
  </div>
</template>
