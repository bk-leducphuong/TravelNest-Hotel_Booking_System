# TravelNest authentication themes

Native Keycloak 26 login themes for the three application clients. Forms and
security behavior come from Keycloak's `keycloak` parent theme; only CSS and
localized headings are overridden. This also styles reset-password, verification,
required-action and MFA pages without maintaining copies of security templates.

| Client                  | Login theme           | Appearance                                               |
| ----------------------- | --------------------- | -------------------------------------------------------- |
| `travelnest-web`        | `travelnest-guest`    | Pale blue canvas, desktop resort photo panel, white card |
| `travelnest-admin`      | `travelnest-admin`    | Hotel admin blue, light gray canvas, rounded panel       |
| `travelnest-superadmin` | `travelnest-platform` | Platform indigo, soft gradient                           |

The guest theme provides shared styles and English/Vietnamese messages. The
other themes inherit it. No remote scripts, fonts, images or credential handlers
are added. Poppins is used when available, otherwise the system font is used.

## Docker Compose

`server/infra/docker-compose.yml` mounts this directory read-only into
`/opt/keycloak/themes`. Recreate the local Keycloak container after adding the
mount. The development realm import already selects guest/admin themes for its
existing client entries. It does not currently define a superadmin client.

**Existing realms:** startup import skips an existing realm. In the Keycloak
Admin Console, open **Clients → the relevant client → Settings → Login theme**,
select the theme from the table, and save. Repeat for each configured client.
Do not delete a realm or database to force a reimport. Leave the realm default
theme unchanged so unrelated clients retain their original appearance.

English is always available. To expose the locale selector, enable
internationalization under Realm settings → Localization, select English and
Vietnamese, and choose the default locale. This is optional and not changed by
the development import.

## Kubernetes / packaged image

The production deployment builds this directory into an image tag; there is no
theme volume mount in the cluster. `.github/workflows/keycloak.yml` builds the
image on every master change under `server/infra/keycloak/**`, pushes
`docker.io/<DOCKERHUB_USERNAME>/travelnest-keycloak:sha-<commit>`, and promotes
that immutable tag into
`deploy/k8s/infra/keycloak/overlays/prod/kustomization.yaml`. Argo CD then rolls
the Keycloak pod, which is what makes the themes appear under
Realm settings → Themes.

Local build (context is this directory, not the repo root):

```sh
docker build -f server/infra/keycloak/Dockerfile -t travelnest-keycloak:26.0 \
  server/infra/keycloak
```

The `travelnest-*` image repository must exist on Docker Hub and be **public** —
the cluster has no image pull secrets — otherwise the rollout fails with
`ImagePullBackOff`.

Client theme selection is declared in the realm JSON that each overlay deploys
(`overlays/prod/travelnest-realm.json`, `overlays/local/travelnest-realm.json`):
`travelnest-web` → `travelnest-guest`, `travelnest-admin` → `travelnest-admin`,
`travelnest-superadmin` → `travelnest-platform`. The PostSync reconcile job
applies client attributes on every sync, so a console edit is reverted; keep
these values in Git.

Themes are cached. After changing CSS, merge the change: the new image tag rolls
the pod. Keep theme caching enabled in production.

## Registration and permissions

Guest registration uses the realm's existing registration flow. A partner account
is an identity only: creating one does **not** grant hotel management permissions.
Existing backend role checks and partner provisioning remain authoritative.

The platform theme hides the public registration link. This is a presentation
choice, **not** an authorization control: registration is enabled realm-wide and
a manually opened registration endpoint can still create an ordinary identity.
Never assign admin or superadmin roles through registration/default realm roles.
Platform access must be provisioned through the existing restricted process.
This change does not implement invitation sending or partner approval workflows.

## Verification before rollout

Use each application's sign-in button so Keycloak receives the correct client ID.
Check these against a running Keycloak 26 instance in both supported languages:

- Login, wrong password, remember me, password visibility, and keyboard focus.
- Guest and partner registration, validation errors and email verification.
- Password reset, expired links, required password updates, and any enabled MFA.
- Social sign-in when configured; successful callbacks return to the right app.
- Platform sign-in omits the public registration link; ordinary accounts still
  cannot access platform APIs.
- At 375px and desktop widths: no horizontal overflow, readable error messages,
  and accessible locale/password controls.

Native Keycloak flow/rendering checks require the actual service; a static HTML
mock cannot validate FreeMarker output, inherited resources, or auth callbacks.

## Background layout

Guest-only `css/guest.css` adds a desktop photo panel at widths of 1000px and
above. Smaller screens show the brand and form without the photo. The resort
photo is optimized from the existing guest app header asset and served locally.
English and Vietnamese welcome text lives in the guest message bundles.
Admin themes load only the shared stylesheet plus their own variant, so they
do not inherit the guest split layout.
