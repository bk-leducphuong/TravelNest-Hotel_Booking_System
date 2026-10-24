import type { Amenity } from "~/services/api/catalog";

export function useAmenityLabels() {
  const { t, te } = useI18n();
  const categoryLabel = (category: string) => {
    const key = `amenities.category.${category}`;
    const words = category.replace(/_/g, " ");
    return te(key) ? t(key) : words.charAt(0).toUpperCase() + words.slice(1);
  };
  // Codes are stable across locales; preserve API labels for future/custom amenities.
  const amenityLabel = (amenity: Amenity) => {
    const key = `amenities.code.${amenity.code}`;
    return te(key) ? t(key) : amenity.name;
  };
  return { categoryLabel, amenityLabel };
}
