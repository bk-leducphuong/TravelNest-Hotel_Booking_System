import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";

const {
  useAuthStoreMock,
  useRouterMock,
  elMessageErrorMock,
  elMessageInfoMock,
} = vi.hoisted(() => {
  const loginSpy = vi.fn().mockResolvedValue(undefined);
  const pushSpy = vi.fn();

  return {
    useAuthStoreMock: vi.fn(() => ({
      login: loginSpy,
    })),
    useRouterMock: vi.fn(() => ({
      push: pushSpy,
      afterEach: vi.fn(),
      beforeResolve: vi.fn(),
    })),
    elMessageErrorMock: vi.fn(),
    elMessageInfoMock: vi.fn(),
  };
});

mockNuxtImport("useAuthStore", () => useAuthStoreMock);
mockNuxtImport("useRouter", () => useRouterMock);
mockNuxtImport("ElMessage", () => ({
  error: elMessageErrorMock,
  info: elMessageInfoMock,
}));

describe("login page (Nuxt runtime)", () => {
  let component: VueWrapper<any>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("~/pages/login.vue");
    component = await mountSuspended(mod.default, { route: "/login" });
  });

  it("renders email and password fields", () => {
    expect(component.html()).toContain("Email");
    expect(component.html()).toContain("Password");
  });

  it("calls auth.login and router.push on successful submit", async () => {
    const authInstance = useAuthStoreMock.mock.results[0].value;
    const routerInstance = useRouterMock.mock.results[0].value;

    const emailInput = component.find("input[type='email']");
    const passwordInput = component.find("input[type='password']");
    const submitButton = component.find("button");

    await emailInput.setValue("admin@example.com");
    await passwordInput.setValue("password123");
    await submitButton.trigger("click");

    expect(authInstance.login).toHaveBeenCalledWith(
      "admin@example.com",
      "password123"
    );
    expect(routerInstance.push).toHaveBeenCalledWith("/");
  });
});
