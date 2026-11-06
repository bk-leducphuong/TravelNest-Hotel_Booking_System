// Present request failures in the owning section, never in a global notification.
export default function errorHandler(error) {
  console.error(error);
}
