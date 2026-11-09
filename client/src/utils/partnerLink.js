/**
 * Opens a partner affiliate link in a new tab.
 *
 * The link is fetched from the API first, so it is no longer inside the click
 * gesture and some browsers block the popup. Callers should always render a
 * fallback link next to this action.
 *
 * `noopener` is applied by clearing `opener` instead of passing it in the
 * features string: when it is passed there, `window.open` returns `null` even
 * on success and callers cannot tell a blocked popup from a working one.
 */
export function openPartnerUrl(url) {
  if (!url) return false;

  const opened = window.open(url, '_blank');

  if (!opened) return false;

  try {
    opened.opener = null;
  } catch {
    // A browser that refuses the assignment has already isolated the tab.
  }

  return true;
}

export default openPartnerUrl;
