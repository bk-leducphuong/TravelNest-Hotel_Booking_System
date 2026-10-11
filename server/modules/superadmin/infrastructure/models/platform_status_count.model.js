/**
 * Precomputed platform status counts for the superadmin console.
 *
 * One row per (metric, status), plus a `__total__` row per metric. Refreshed by
 * the platform-stats job; the console only reads this table.
 */
module.exports = function (sequelize, DataTypes) {
  const PlatformStatusCount = sequelize.define(
    'platform_status_counts',
    {
      metric: {
        type: DataTypes.STRING(32),
        allowNull: false,
        primaryKey: true,
        comment: 'Entity being counted: hotels | users | bookings',
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        primaryKey: true,
        comment: 'Status bucket, or __total__ for the metric total',
      },
      count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      computed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When this snapshot row was produced',
      },
    },
    {
      sequelize,
      tableName: 'platform_status_counts',
      timestamps: false,
    }
  );

  return PlatformStatusCount;
};
