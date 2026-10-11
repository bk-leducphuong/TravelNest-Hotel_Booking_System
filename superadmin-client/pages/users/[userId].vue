<script setup lang="ts">
import { fetchUser, type UserDetail } from "~/services/api/users";

const route = useRoute();
const userId = computed(() => String(route.params.userId));

const loading = ref(false);
const error = ref<string | null>(null);
const user = ref<UserDetail | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    user.value = await fetchUser(userId.value);
  } catch (err) {
    user.value = null;
    error.value = err instanceof Error ? err.message : "Failed to load user";
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <NuxtLink to="/users" class="text-sm text-indigo-600 hover:text-indigo-800">
      ← Back to users
    </NuxtLink>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <div v-loading="loading">
      <template v-if="user">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
              {{ user.fullName || user.email }}
            </h2>
            <p class="mt-1 text-sm text-slate-500">{{ user.email }}</p>
          </div>
          <el-tag :type="statusTagType(user.status)" effect="plain">
            {{ user.status }}
          </el-tag>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <el-card class="shadow-sm lg:col-span-2">
            <template #header>
              <span class="font-medium">Profile</span>
            </template>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-400">
                  Phone
                </dt>
                <dd class="text-sm text-slate-900">
                  {{ user.phoneNumber || "—" }}
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-400">
                  Date of birth
                </dt>
                <dd class="text-sm text-slate-900">
                  {{ user.dateOfBirth || "—" }}
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-400">
                  Address
                </dt>
                <dd class="text-sm text-slate-900">
                  {{ user.address || "—" }}
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-400">
                  Joined
                </dt>
                <dd class="text-sm text-slate-900">
                  {{ formatDate(user.createdAt) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-400">
                  Last login
                </dt>
                <dd class="text-sm text-slate-900">
                  {{ formatDate(user.lastLoginAt) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-400">
                  Email verified
                </dt>
                <dd class="text-sm text-slate-900">
                  {{ formatDate(user.emailVerifiedAt) }}
                </dd>
              </div>
            </dl>
          </el-card>

          <el-card class="shadow-sm">
            <template #header>
              <span class="font-medium">Access</span>
            </template>
            <p class="text-xs uppercase tracking-wide text-slate-400">
              Global roles
            </p>
            <div class="mt-1 flex flex-wrap gap-1">
              <el-tag
                v-for="role in user.globalRoles"
                :key="role"
                size="small"
                effect="plain"
              >
                {{ role }}
              </el-tag>
              <span
                v-if="!user.globalRoles.length"
                class="text-sm text-slate-400"
                >—</span
              >
            </div>
            <p class="mt-4 text-xs uppercase tracking-wide text-slate-400">
              Bookings
            </p>
            <p class="text-2xl font-semibold text-slate-900">
              {{ user.bookings.total }}
            </p>
          </el-card>
        </div>

        <el-card class="mt-6 shadow-sm">
          <template #header>
            <span class="font-medium">Hotel memberships</span>
          </template>
          <el-empty
            v-if="!user.memberships.length"
            description="No hotel memberships"
            :image-size="60"
          />
          <el-table v-else :data="user.memberships">
            <el-table-column label="Hotel" min-width="220">
              <template #default="{ row }">
                <NuxtLink
                  :to="`/hotels/${row.hotelId}`"
                  class="text-indigo-600 hover:text-indigo-800"
                >
                  {{ row.hotelName || row.hotelId }}
                </NuxtLink>
              </template>
            </el-table-column>
            <el-table-column label="Role" width="140">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{
                  row.role || "—"
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Primary owner" width="140">
              <template #default="{ row }">
                <el-tag v-if="row.isPrimaryOwner" type="success" size="small"
                  >Yes</el-tag
                >
                <span v-else class="text-slate-400">No</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </div>
  </section>
</template>
