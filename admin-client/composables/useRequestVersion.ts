/** Ignore superseded requests, including requests from a previous hotel context. */
export function useRequestVersion() {
  const auth = useAuthStore();
  let version = 0;
  const invalidate = () => {
    version++;
  };
  const begin = () => {
    const request = ++version;
    const hotelId = auth.activeHotelId;
    return () => request === version && hotelId === auth.activeHotelId;
  };
  onScopeDispose(invalidate);
  return { begin, invalidate };
}
