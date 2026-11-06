/** Only the latest live request may update a page, including after unmount. */
export function useRequestVersion() {
  let version = 0;
  onBeforeUnmount(() => {
    version++;
  });
  return () => {
    const current = ++version;
    return () => current === version;
  };
}
