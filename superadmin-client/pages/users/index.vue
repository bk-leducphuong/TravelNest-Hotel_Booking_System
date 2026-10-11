<script setup lang="ts">
import { fetchUsers, type UserSummary } from "~/services/api/users";

const loading = ref(false);
const error = ref<string | null>(null);
const users = ref<UserSummary[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const search = ref("");
const status = ref<string | undefined>(undefined);
const role = ref<string | undefined>(undefined);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchUsers({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      status: status.value,
      role: role.value,
    });
    users.value = result.data;
    total.value = result.meta.total;
  } catch (err) {
    users.value = [];
    total.value = 0;
    error.value = err instanceof Error ? err.message : "Failed to load users";
  } finally {
    loading.value = false;
  }
};

const onSearch = () => {
  page.value = 1;
  load();
};

const onFilterChange = () => {
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
          Users
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Every account on the platform · {{ total }} total
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <el-input
          v-model="search"
          placeholder="Search name or email"
          clearable
          class="w-56"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-select
          v-model="status"
          placeholder="All statuses"
          clearable
          class="w-40"
          @change="onFilterChange"
        >
          <el-option label="Active" value="active" />
          <el-option label="Inactive" value="inactive" />
          <el-option label="Banned" value="banned" />
        </el-select>
        <el-select
          v-model="role"
          placeholder="All roles"
          clearable
          class="w-40"
          @change="onFilterChange"
        >
          <el-option label="User" value="user" />
          <el-option label="Admin" value="admin" />
          <el-option label="Support agent" value="support_agent" />
          <el-option label="Owner" value="owner" />
        </el-select>
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

    <el-table v-loading="loading" :data="users" stripe>
      <el-table-column label="Email" min-width="220">
        <template #default="{ row }">
          <NuxtLink
            :to="`/users/${row.id}`"
            class="font-medium text-indigo-600 hover:text-indigo-800"
          >
            {{ row.email }}
          </NuxtLink>
        </template>
      </el-table-column>
      <el-table-column label="Name" min-width="160">
        <template #default="{ row }">{{ row.fullName || "—" }}</template>
      </el-table-column>
      <el-table-column label="Status" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" effect="plain">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Global roles" min-width="180">
        <template #default="{ row }">
          <el-tag
            v-for="name in row.globalRoles"
            :key="name"
            size="small"
            effect="plain"
            class="mr-1"
          >
            {{ name }}
          </el-tag>
          <span v-if="!row.globalRoles.length" class="text-slate-400">—</span>
        </template>
      </el-table-column>
      <el-table-column label="Joined" min-width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="Last login" min-width="170">
        <template #default="{ row }">{{
          formatDate(row.lastLoginAt)
        }}</template>
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
