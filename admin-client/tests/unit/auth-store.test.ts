import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "../../stores/auth";

describe("auth store (unit)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts unauthenticated", () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
  });

  it("exposes user and isAuthenticated when session is set", () => {
    const auth = useAuthStore();

    auth.session = {
      sessionId: "session-123",
      user: {
        id: "user-1",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "admin",
      },
    };

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user?.email).toBe("user@example.com");
  });

  it("clearSession removes session and resets auth state", () => {
    const auth = useAuthStore();

    auth.session = {
      sessionId: "session-123",
      user: {
        id: "user-1",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "admin",
      },
    };

    auth.clearSession();

    expect(auth.session).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
  });
});
