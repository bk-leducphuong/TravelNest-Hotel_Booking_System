<script setup lang="ts">
import { fetchAudit, type AuditEntry } from "~/services/api/audit";

const loading = ref(false);
const error = ref<string | null>(null);
const entries = ref<AuditEntry[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);
const action = ref("");
const entityType = ref("");

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchAudit({
      page: page.value,
      limit: limit.value,
      action: action.value || undefined,
      entityType: entityType.value || undefined,
    });
    entries.value = result.data;
    total.value = result.meta.total;
  } catch (err) {
    entries.value = [];
    total.value = 0;
    error.value =
      err instanceof Error ? err.message : "Failed to load audit log";
  } finally {
    loading.value = false;
  }
};

const onSearch = () => {
  page.value = 1;
  load();
};

watch(page, load);
onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Audit log
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Sensitive operations across the platform · {{ total }} entries
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <el-input
          v-model="action"
          placeholder="Filter by action"
          clearable
          class="w-52"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-input
          v-model="entityType"
          placeholder="Entity type"
          clearable
          class="w-40"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button :loading="loading" @click="onSearch">Search</el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <el-table v-loading="loading" :data="entries" stripe>
      <el-table-column label="When" min-width="180">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="Action" min-width="200">
        <template #default="{ row }">
          <code class="text-xs text-slate-700">{{ row.action }}</code>
        </template>
      </el-table-column>
      <el-table-column label="Entity" min-width="160">
        <template #default="{ row }">
          {{ row.entity_type }}
          <span v-if="row.entity_id" class="text-slate-400">
            · {{ row.entity_id.slice(0, 8) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Actor" min-width="180">
        <template #default="{ row }">
          {{
            row.actor_user_id ? row.actor_user_id.slice(0, 8) : row.actor_type
          }}
        </template>
      </el-table-column>
      <el-table-column label="Reason" min-width="220">
        <template #default="{ row }">{{ row.reason || "—" }}</template>
      </el-table-column>
    </el-table>

    <div class="flex justify-end">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        background
      />
    </div>
  </section>
</template>
