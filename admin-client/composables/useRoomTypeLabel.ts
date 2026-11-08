export function useRoomTypeLabel() {
  const { t, te } = useI18n();

  // `rooms.room_type` is a fixed ENUM; fall back to the raw value for legacy rows.
  const roomTypeLabel = (type?: string | null) => {
    if (!type) return "";
    const key = `rooms.type.${type}`;
    return te(key) ? t(key) : type;
  };

  return { roomTypeLabel };
}
