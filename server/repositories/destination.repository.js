const { Op } = require('sequelize');

const { destinations } = require('../models');

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

  async findBestMatchByName(text) {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();

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

    const likeMatches = await destinations.findAll({
      where: {
        is_active: true,
        normalized_name: {
          [Op.like]: `%${normalized}%`,
        },
      },
      order: [
        ['type', 'ASC'],
        ['display_name', 'ASC'],
      ],
      limit: 10,
      raw: true,
    });

    if (!likeMatches.length) return null;

    const cityMatch = likeMatches.find((d) => d.type === 'city');
    return cityMatch || likeMatches[0];
  }
}

module.exports = new DestinationRepository();

