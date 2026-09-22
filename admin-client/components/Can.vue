<script setup lang="ts">
const props = defineProps<{
  permission?: string;
  any?: string[];
}>();

const { can, canAny } = usePermissions();

const allowed = computed(() => {
  if (props.any && props.any.length > 0) {
    return canAny(props.any);
  }
  if (props.permission) {
    return can(props.permission);
  }
  return true;
});
</script>

<template>
  <slot v-if="allowed" />
</template>
