'use strict';

/**
 * Backfill hotels.country_id and hotels.city_id from legacy string columns.
 *
 * Strategy:
 *  - For each hotel, if its string `country` matches an existing `countries.name`
 *    (case-insensitive, trimmed), set `hotels.country_id` to that country's id.
 *  - For each hotel with a mapped country_id, if its string `city` matches an
 *    existing `cities.name` for that country, set `hotels.city_id` accordingly.
 *
 * This relies on countries/cities having been seeded already (e.g. Vietnam + cities).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1) Backfill country_id based on string country name
      await queryInterface.sequelize.query(
        `
        UPDATE hotels h
        JOIN countries c
          ON TRIM(LOWER(h.country)) = TRIM(LOWER(c.name))
        SET h.country_id = c.id
        WHERE h.country IS NOT NULL
          AND h.country <> ''
          AND h.country_id IS NULL;
      `,
        { transaction }
      );

      // 2) Backfill city_id based on string city name, constrained by country_id
      await queryInterface.sequelize.query(
        `
        UPDATE hotels h
        JOIN cities ci
          ON TRIM(LOWER(h.city)) = TRIM(LOWER(ci.name))
         AND h.country_id = ci.country_id
        SET h.city_id = ci.id
        WHERE h.city IS NOT NULL
          AND h.city <> ''
          AND h.city_id IS NULL
          AND h.country_id IS NOT NULL;
      `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Reset backfilled FKs (do not modify countries/cities tables)
      await queryInterface.sequelize.query(
        `
        UPDATE hotels
        SET city_id = NULL
        WHERE city_id IS NOT NULL;
      `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        UPDATE hotels
        SET country_id = NULL
        WHERE country_id IS NOT NULL;
      `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

