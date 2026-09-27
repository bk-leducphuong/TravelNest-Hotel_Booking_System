import Keycloak from "keycloak-js";
import { useRuntimeConfig } from "#imports";

/**
 * Keycloak (OIDC + PKCE) for the admin console.
 *
 * The admin client is a public SPA: it obtains access tokens from Keycloak and
 * sends them as bearer tokens to the Admin BFF. It never uses session cookies.
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
  if (!path) {
    return `${window.location.origin}/`;
  }
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function initializeKeycloak(): Promise<boolean> {
  if (!initPromise) {
    const client = ensureClient();
    initPromise = client.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: silentCheckSsoRedirectUri(),
    });
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

export async function login({ redirectPath }: { redirectPath?: string } = {}): Promise<void> {
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
