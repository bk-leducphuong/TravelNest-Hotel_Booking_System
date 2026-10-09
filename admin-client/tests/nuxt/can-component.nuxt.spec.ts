import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";

const { useAuthStoreMock } = vi.hoisted(() => ({
  useAuthStoreMock: vi.fn(() => ({
    globalRoles: ["admin"],
    permissions: ["review.read", "booking.read"],
    activeHotel: null,
    isAuthenticated: false,
    sessionLoaded: true,
    ensureInitialized: vi.fn().mockResolvedValue(undefined),
    loadSession: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  })),
}));

// `usePermissions` imports the store module directly, so mock the module itself;
// `mockNuxtImport` only intercepts Nuxt auto-imports.
vi.mock("~/stores/auth", () => ({ useAuthStore: useAuthStoreMock }));

describe("Can component (Nuxt runtime)", () => {
  let Can: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    Can = (await import("~/components/Can.vue")).default;
  });

  it("renders the slot when the permission is granted", async () => {
    const wrapper: VueWrapper<any> = await mountSuspended(Can, {
      props: { permission: "review.read" },
      slots: { default: () => "allowed-content" },
    });

    expect(wrapper.text()).toContain("allowed-content");
  });

  it("hides the slot when the permission is missing", async () => {
    const wrapper: VueWrapper<any> = await mountSuspended(Can, {
      props: { permission: "payment.refund" },
      slots: { default: () => "hidden-content" },
    });

    expect(wrapper.text()).not.toContain("hidden-content");
  });

  it("supports the `any` variant", async () => {
    const wrapper: VueWrapper<any> = await mountSuspended(Can, {
      props: { any: ["payment.refund", "booking.read"] },
      slots: { default: () => "any-content" },
    });

    expect(wrapper.text()).toContain("any-content");
  });
});
