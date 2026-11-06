import { ElMessage, ElMessageBox } from "element-plus";
import type { Ref } from "vue";

export function useChangeGuard() {
  const editors = useState<
    Record<string, { dirty: boolean; pending: boolean }>
  >("admin-editors", () => ({}));
  const { t } = useI18n();
  const mayLeave = async () => {
    if (Object.values(editors.value).some((editor) => editor.pending)) {
      ElMessage.info(t("editor.wait"));
      return false;
    }
    if (!Object.values(editors.value).some((editor) => editor.dirty))
      return true;
    try {
      await ElMessageBox.confirm(t("editor.unsaved"), t("editor.title"), {
        confirmButtonText: t("editor.discard"),
        cancelButtonText: t("editor.stay"),
        type: "warning",
      });
      return true;
    } catch {
      return false;
    }
  };
  return { editors, mayLeave };
}

export function useEditorGuard(
  key: string,
  dirty: Ref<boolean>,
  pending: Ref<boolean>
) {
  const { editors, mayLeave } = useChangeGuard();
  watch(
    [dirty, pending],
    () => {
      editors.value[key] = { dirty: dirty.value, pending: pending.value };
    },
    { immediate: true, flush: "sync" }
  );
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty.value || pending.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  onMounted(() => window.addEventListener("beforeunload", beforeUnload));
  onBeforeUnmount(() => {
    editors.value = Object.fromEntries(
      Object.entries(editors.value).filter(([id]) => id !== key)
    );
    window.removeEventListener("beforeunload", beforeUnload);
  });
  onBeforeRouteLeave(() => mayLeave());
  onBeforeRouteUpdate((to, from) => to.path === from.path || mayLeave());
  return { mayLeave };
}
