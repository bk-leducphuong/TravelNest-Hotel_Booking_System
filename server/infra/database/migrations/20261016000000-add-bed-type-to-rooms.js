'use strict';

const { addColumnIfMissing, columnExists } = require('../migration-utils/schema');

const BED_TYPES = [
  'single',
  'double',
  'queen',
  'king',
  'super_king',
  'twin',
  'bunk',
  'sofa_bed',
  'murphy',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addColumnIfMissing(queryInterface, 'rooms', 'bed_type', {
      type: Sequelize.ENUM(...BED_TYPES),
      allowNull: true,
      after: 'room_type',
      comment: 'Primary bed configuration (e.g., king, twin)',
    });
  },

  down: async (queryInterface) => {
    if (await columnExists(queryInterface, 'rooms', 'bed_type')) {
      await queryInterface.removeColumn('rooms', 'bed_type');
    }
  },
};
