const { destinations } = require('@platform/database');
const { normalizeText, compactKey } = require('@utils/placeName');

/** The destinations table is small (provinces + countries); cap the scan anyway. */
const CANDIDATE_LIMIT = 500;

class DestinationRepository {
  async findById(id) {
    if (!id) return null;
    return destinations.findByPk(id, { raw: true });
  }

  async findActiveById(id) {
    if (!id) return null;
    return destinations.findOne({
      where: {
        id,
        is_active: true,
      },
      raw: true,
    });
  }

  /**
   * Resolve a free-text place name to a destination.
   *
   * Order: exact normalized name, then a diacritic/space-insensitive compact
   * match ("Hanoi" == "Ha Noi" == "Hà Nội"), then a substring fallback for
   * partial input ("Thua Thien" -> "Thua Thien - Hue"). Cities win over
   * countries at every step.
   */
  async findBestMatchByName(text) {
    const normalized = normalizeText(text);
    if (!normalized) return null;

    const exactCity = await destinations.findOne({
      where: {
        type: 'city',
        is_active: true,
        normalized_name: normalized,
      },
      raw: true,
    });
    if (exactCity) return exactCity;

    const exactCountry = await destinations.findOne({
      where: {
        type: 'country',
        is_active: true,
        normalized_name: normalized,
      },
      raw: true,
    });
    if (exactCountry) return exactCountry;

    const compact = compactKey(text);
    const candidates = await destinations.findAll({
      where: { is_active: true },
      limit: CANDIDATE_LIMIT,
      raw: true,
    });

    const matchesCompact = (destination) =>
      Boolean(compact) &&
      (compactKey(destination.display_name) === compact ||
        compactKey(destination.normalized_name) === compact ||
        compactKey(destination.slug) === compact);

    const compactCity = candidates.find((d) => d.type === 'city' && matchesCompact(d));
    if (compactCity) return compactCity;

    const compactCountry = candidates.find((d) => d.type === 'country' && matchesCompact(d));
    if (compactCountry) return compactCountry;

    const key = compact || normalized;
    const contains = (destination) => compactKey(destination.normalized_name).includes(key);

    const containsCity = candidates.find((d) => d.type === 'city' && contains(d));
    if (containsCity) return containsCity;

    const containsCountry = candidates.find((d) => d.type === 'country' && contains(d));
    return containsCountry || null;
  }

  /**
   * Lightweight destination autocomplete used as a DB fallback when
   * Elasticsearch returns no suggestions. Returns ES-shaped suggestion objects
   * (`{ text, score, payload }`) so the API response stays uniform.
   */
  async suggest(text, limit = 10) {
    const normalized = normalizeText(text);
    if (!normalized) return [];

    const key = compactKey(text) || normalized;

    const candidates = await destinations.findAll({
      where: { is_active: true },
      limit: CANDIDATE_LIMIT,
      raw: true,
    });

    const scoreOf = (destination) => {
      const display = compactKey(destination.display_name);
      const norm = compactKey(destination.normalized_name);
      if (display === key || norm === key) return 3;
      if (display.startsWith(key) || norm.startsWith(key)) return 2;
      if (display.includes(key) || norm.includes(key)) return 1;
      return 0;
    };

    return candidates
      .map((destination) => ({ destination, score: scoreOf(destination) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.destination.display_name.localeCompare(b.destination.display_name)
      )
      .slice(0, limit)
      .map(({ destination, score }) => ({
        text: destination.display_name,
        score,
        payload: {
          id: destination.id,
          type: destination.type,
          city_id: destination.city_id,
          country_id: destination.country_id,
          display_name: destination.display_name,
          country_name: destination.country_name,
          slug: destination.slug,
        },
      }));
  }
}

module.exports = new DestinationRepository();
