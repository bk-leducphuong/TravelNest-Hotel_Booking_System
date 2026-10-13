import Keycloak from "keycloak-js";
import { useRuntimeConfig } from "#imports";

/**
 * Keycloak (OIDC + PKCE) for the platform console.
 *
 * The superadmin client is a public SPA: it obtains access tokens from Keycloak
 * and sends them as bearer tokens to the superadmin API. It never uses session
 * cookies.
 */

const DEFAULT_MIN_VALIDITY_SECONDS = 30;

interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

let keycloak: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;

function buildConfig(): KeycloakConfig {
  const config = useRuntimeConfig();

  const url = config.public.keycloakUrl as string;
  const realm = config.public.keycloakRealm as string;
  const clientId = config.public.keycloakClientId as string;

  if (!url || !realm || !clientId) {
    throw new Error(
      "Missing Keycloak configuration. Set NUXT_PUBLIC_KEYCLOAK_URL, NUXT_PUBLIC_KEYCLOAK_REALM and NUXT_PUBLIC_KEYCLOAK_CLIENT_ID."
    );
  }

  return { url, realm, clientId };
}

function ensureClient(): Keycloak {
  if (!keycloak) {
    keycloak = new Keycloak(buildConfig());
  }
  return keycloak;
}

function silentCheckSsoRedirectUri(): string {
  const config = useRuntimeConfig();
  const configured = config.public.keycloakSilentCheckSsoRedirectUri as string;
  return configured || `${window.location.origin}/silent-check-sso.html`;
}

function absoluteRedirectUri(path?: string): string {
  // Never carry a URL fragment into the OIDC redirect URI. On the auth callback
  // the current URL contains `#state=…&code=…`; reusing it as the redirect
  // target makes the fragment grow on every attempt (redirect loop).
  const stripFragment = (value: string) => value.split("#")[0];

  if (!path) {
    return `${window.location.origin}/`;
  }
  if (/^https?:\/\//.test(path)) {
    return stripFragment(path);
  }
  return stripFragment(
    `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
  );
}

/**
 * keycloak-js's silent-check listener treats every same-origin message as a URL
 * and calls `new URL(event.data)`. Non-string messages (from browser extensions
 * or devtools) make that throw `Failed to construct 'URL': Invalid URL`. Drop
 * same-origin non-string messages while the silent check runs.
 */
function guardNonStringMessages(): () => void {
  const handler = (event: MessageEvent) => {
    if (
      typeof event.data !== "string" &&
      event.origin === window.location.origin
    ) {
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener("message", handler, true);
  return () => window.removeEventListener("message", handler, true);
}

export async function initializeKeycloak(): Promise<boolean> {
  if (!initPromise) {
    const client = ensureClient();
    const releaseMessageGuard = guardNonStringMessages();

    initPromise = client
      .init({
        onLoad: "check-sso",
        pkceMethod: "S256",
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: silentCheckSsoRedirectUri(),
      })
      // A silent-SSO / SSO-check failure (e.g. the hidden iframe timing out
      // behind third-party-cookie or edge restrictions) must not take the whole
      // console down with a 500. Degrade to an unauthenticated session instead.
      .catch((error) => {
        console.warn("[keycloak] init failed; continuing unauthenticated", error);
        return false;
      })
      .finally(releaseMessageGuard);
  }
  return initPromise;
}

export function isAuthenticated(): boolean {
  return Boolean(keycloak?.authenticated);
}

export async function getAccessToken(
  minValidity: number = DEFAULT_MIN_VALIDITY_SECONDS
): Promise<string | null> {
  const client = ensureClient();

  if (!client.authenticated) {
    return null;
  }

  await client.updateToken(minValidity);
  return client.token || null;
}

export async function login({
  redirectPath,
}: { redirectPath?: string } = {}): Promise<void> {
  return ensureClient().login({
    redirectUri: absoluteRedirectUri(redirectPath || window.location.href),
    scope: "openid",
  });
}

export async function logout(): Promise<void> {
  return ensureClient().logout({
    redirectUri: `${window.location.origin}/login`,
  });
}
