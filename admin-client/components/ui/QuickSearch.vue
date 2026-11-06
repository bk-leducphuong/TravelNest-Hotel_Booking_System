<script setup lang="ts">
import { Search } from "lucide-vue-next";
const open = ref(false);
const query = ref("");
const selected = ref(0);
const input = ref<HTMLInputElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const { destinations } = useAdminNavigation();
const { t } = useI18n();
const router = useRouter();
const results = computed(() =>
  destinations.value.filter((item) =>
    t(item.labelKey)
      .toLocaleLowerCase()
      .includes(query.value.trim().toLocaleLowerCase())
  )
);
watch([query, destinations], () => {
  selected.value = 0;
});
const move = (direction: number) => {
  if (!results.value.length) return;
  selected.value =
    (selected.value + direction + results.value.length) % results.value.length;
  nextTick(() =>
    document
      .getElementById(`quick-result-${selected.value}`)
      ?.scrollIntoView({ block: "nearest" })
  );
};
const go = async (index = selected.value) => {
  const item = results.value[index];
  if (!item) return;
  const failure = await router.push(item.to);
  if (!failure) open.value = false;
};
const show = () => {
  query.value = "";
  selected.value = 0;
  open.value = true;
};
const shortcut = (event: KeyboardEvent) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  )
    return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    show();
  }
};
onMounted(() => window.addEventListener("keydown", shortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", shortcut));
</script>
<template>
  <button
    ref="trigger"
    type="button"
    class="flex min-h-10 items-center gap-2 rounded-full bg-soft px-3 py-2 text-sm text-muted md:px-4"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-label="$t('shell.quickSearch')"
    @click="show"
  >
    <Search :size="18" aria-hidden="true" /><span class="hidden lg:inline">{{
      $t("shell.quickSearch")
    }}</span
    ><kbd class="hidden text-xs md:inline">Ctrl/⌘ K</kbd>
  </button>
  <el-dialog
    v-model="open"
    :title="$t('shell.quickSearch')"
    width="520px"
    @opened="input?.focus()"
    @closed="trigger?.focus()"
  >
    <input
      ref="input"
      v-model="query"
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded="true"
      aria-controls="quick-results"
      :aria-activedescendant="
        results.length ? `quick-result-${selected}` : undefined
      "
      :aria-label="$t('shell.searchDestinations')"
      :placeholder="$t('shell.searchDestinations')"
      class="w-full rounded-xl border border-gray-300 bg-soft px-4 py-3"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="go()"
    />
    <ul
      id="quick-results"
      role="listbox"
      :aria-label="$t('shell.navigation')"
      class="mt-3 max-h-80 overflow-y-auto"
    >
      <li
        v-for="(item, index) in results"
        :id="`quick-result-${index}`"
        :key="item.to"
        role="option"
        :aria-selected="selected === index"
        class="cursor-pointer rounded-xl px-4 py-3 text-sm"
        :class="selected === index ? 'bg-soft text-brand' : 'text-muted'"
        @pointermove="selected = index"
        @click="go(index)"
      >
        {{ $t(item.labelKey) }}
      </li>
    </ul>
    <p
      v-if="!results.length"
      class="py-6 text-center text-sm text-muted"
      role="status"
    >
      {{ $t("shell.noDestinations") }}
    </p>
  </el-dialog>
</template>
