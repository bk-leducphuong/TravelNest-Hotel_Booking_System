const { Op } = require('sequelize');

const { Cities, Countries } = require('@platform/database');

/**
 * Location lookups for the admin property editor (city/country selects).
 * Cities and countries are global reference data: read-only, paginated.
 */

async function findCitiesForAdmin({ search, countryId, limit = 100, offset = 0 } = {}) {
  const where = {};
  if (countryId) where.country_id = countryId;
  if (search) where.name = { [Op.like]: `%${search}%` };

  return await Cities.findAndCountAll({
    where,
    attributes: ['id', 'name', 'slug', 'country_id'],
    limit,
    offset,
    order: [['name', 'ASC']],
    distinct: true,
  });
}

async function findCountriesForAdmin({ search, limit = 200, offset = 0 } = {}) {
  const where = {};
  if (search) where.name = { [Op.like]: `%${search}%` };

  return await Countries.findAndCountAll({
    where,
    attributes: ['id', 'name', 'iso_code'],
    limit,
    offset,
    order: [['name', 'ASC']],
    distinct: true,
  });
}

module.exports = {
  findCitiesForAdmin,
  findCountriesForAdmin,
};
