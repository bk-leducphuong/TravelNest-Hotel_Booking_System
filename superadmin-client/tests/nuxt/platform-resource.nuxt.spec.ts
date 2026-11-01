import { describe, it, expect, vi, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, ref } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { usePlatformResource } from "../../composables/usePlatformResource";

const { store, can } = vi.hoisted(() => ({
  store: {
    user: { id: "operator" },
    isAuthenticated: true,
    isPlatformStaff: true,
    sessionLoaded: true,
    permissions: ["platform.overview.read"],
    ensureInitialized: vi.fn().mockResolvedValue(undefined),
  },
  can: vi.fn(() => true),
}));
mockNuxtImport("useAuthStore", () => () => store);
mockNuxtImport("usePermissions", () => () => ({ can }));

describe("platform record request ownership", () => {
  let wrapper: VueWrapper | undefined;
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });
  it("loads a changed record key and rejects a superseded result", async () => {
    const key = ref("first");
    let resolveFirst!: (value: { name: string }) => void;
    const first = new Promise<{ name: string }>((resolve) => {
      resolveFirst = resolve;
    });
    const fetcher = vi.fn(() =>
      key.value === "first" ? first : Promise.resolve({ name: "Second record" })
    );
    const Component = defineComponent({
      setup() {
        return usePlatformResource(
          "platform.user.read",
          () => key.value,
          fetcher
        );
      },
      template:
        '<div>{{ data?.name }}<span v-if="loading">Loading</span></div>',
    });
    wrapper = await mountSuspended(Component);
    expect(wrapper.text()).toContain("Loading");
    key.value = "second";
    await flushPromises();
    expect(wrapper.text()).toBe("Second record");
    resolveFirst({ name: "Wrong old person" });
    await flushPromises();
    expect(wrapper.text()).toBe("Second record");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
