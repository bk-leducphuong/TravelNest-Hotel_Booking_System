/**
 * Precomputed platform finance totals for the superadmin console.
 *
 * One row per (metric, currency). Refreshed by the platform-stats job; the
 * console only reads this table.
 */
module.exports = function (sequelize, DataTypes) {
  const PlatformFinanceTotal = sequelize.define(
    'platform_finance_totals',
    {
      metric: {
        type: DataTypes.STRING(32),
        allowNull: false,
        primaryKey: true,
        comment: 'gross | refunds | payouts_paid | payouts_pending',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        primaryKey: true,
      },
      count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      amount: {
        type: DataTypes.DECIMAL(18, 2),
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
      tableName: 'platform_finance_totals',
      timestamps: false,
    }
  );

  return PlatformFinanceTotal;
};
