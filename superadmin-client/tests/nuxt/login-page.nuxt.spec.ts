import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";

const { loginSpy, useAuthStoreMock, routeMock } = vi.hoisted(() => {
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
    globalRoles: [],
    user: null,
  };
  return {
    routeMock: {
      path: "/login",
      fullPath: "/login",
      meta: {},
      params: {},
      query: {} as Record<string, string>,
    },
    loginSpy: login,
    useAuthStoreMock: vi.fn(() => store),
  };
});

mockNuxtImport("useAuthStore", () => useAuthStoreMock);
mockNuxtImport("useRoute", () => () => routeMock);

describe("login page (Nuxt runtime)", () => {
  let component: VueWrapper;

  beforeEach(async () => {
    vi.clearAllMocks();
    routeMock.query = {};
    const mod = await import("~/pages/login.vue");
    component = await mountSuspended(mod.default);
  });

  afterEach(() => component.unmount());

  it("renders the platform sign-in call to action", () => {
    expect(component.text()).toContain("Trestay Platform");
    expect(component.text()).toContain("Sign in with Trestay");
  });

  it("starts the Keycloak login flow when clicked", async () => {
    await component.get("button").trigger("click");
    await flushPromises();

    expect(loginSpy).toHaveBeenCalledTimes(1);
  });
  it.each(["https://example.test", "//example.test", "/\\example.test"])(
    "rejects an external provider return destination: %s",
    async (redirect) => {
      routeMock.query.redirect = redirect;
      await component.get("button").trigger("click");
      await flushPromises();
      expect(loginSpy).toHaveBeenCalledWith("/");
    }
  );
  it("preserves a safe internal return destination", async () => {
    routeMock.query.redirect = "/hotels?page=2";
    await component.get("button").trigger("click");
    await flushPromises();
    expect(loginSpy).toHaveBeenCalledWith("/hotels?page=2");
  });
  it("offers retry when starting provider login fails", async () => {
    loginSpy.mockRejectedValueOnce(new Error("provider unavailable"));
    await component.get("button").trigger("click");
    await flushPromises();
    expect(component.get('[role="alert"]').text()).toContain(
      "We couldn't complete sign-in"
    );
    expect(component.get("button").attributes("disabled")).toBeUndefined();
  });
});
