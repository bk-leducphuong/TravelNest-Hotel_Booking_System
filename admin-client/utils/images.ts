/** Media APIs return object keys as well as public URLs. Never resolve a key on the admin origin. */
export function mediaImageUrl(
  value: string | null | undefined,
  base: string
): string {
  const source = value?.trim();
  if (!source) return "";
  if (/^(https?:\/\/|\/\/|blob:|data:image\/)/i.test(source)) return source;
  if (/^[a-z][a-z\d+.-]*:/i.test(source)) return "";
  const publicBase = base.trim().replace(/\/+$/, "");
  if (!publicBase) return "";
  return `${publicBase}/${source.replace(/^\/+/, "")}`;
}
