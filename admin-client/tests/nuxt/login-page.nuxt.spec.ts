import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";

const { loginSpy, useAuthStoreMock } = vi.hoisted(() => {
  const login = vi.fn().mockResolvedValue(undefined);
  const store = {
    login,
    logout: vi.fn(),
    reset: vi.fn(),
    ensureInitialized: vi.fn().mockResolvedValue(undefined),
    loadSession: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: false,
    sessionLoaded: true,
    permissions: [],
    hotels: [],
    user: null,
    activeHotelId: null,
  };
  return {
    loginSpy: login,
    useAuthStoreMock: vi.fn(() => store),
  };
});

mockNuxtImport("useAuthStore", () => useAuthStoreMock);

describe("login page (Nuxt runtime)", () => {
  let component: VueWrapper<any>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("~/pages/login.vue");
    component = await mountSuspended(mod.default as any);
  });

  it("renders the TravelNest sign-in call to action", () => {
    expect(component.text()).toContain("TravelNest Admin");
    expect(component.text()).toContain("Sign in with TravelNest");
  });

  it("starts the Keycloak login flow when clicked", async () => {
    await component.get("button").trigger("click");
    await flushPromises();

    expect(loginSpy).toHaveBeenCalledTimes(1);
  });
});
