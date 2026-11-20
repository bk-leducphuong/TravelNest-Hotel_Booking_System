module.exports = function (sequelize, DataTypes) {
  const AnalyticsSearchLog = sequelize.define(
    'analytics_search_logs',
    {
      search_id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
      user_id: { type: DataTypes.CHAR(36), allowNull: true },
      destination_id: { type: DataTypes.CHAR(36), allowNull: true },
      destination_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '' },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      radius: { type: DataTypes.INTEGER, allowNull: true },
      search_time: { type: DataTypes.DATE(3), allowNull: false },
      adults: { type: DataTypes.INTEGER, allowNull: false },
      children: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      rooms: { type: DataTypes.INTEGER, allowNull: false },
      check_in_date: { type: DataTypes.DATEONLY, allowNull: true },
      check_out_date: { type: DataTypes.DATEONLY, allowNull: true },
      nights: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE(3), allowNull: false },
      updated_at: { type: DataTypes.DATE(3), allowNull: false },
    },
    {
      tableName: 'analytics_search_logs',
      timestamps: false,
      // Owned by the Go analytics service; Node only seeds it in development.
      indexes: [
        {
          name: 'idx_analytics_search_user_time',
          fields: ['user_id', 'is_deleted', 'search_time'],
        },
        {
          name: 'idx_analytics_search_destination_time',
          fields: ['destination_id', 'destination_type', 'is_deleted', 'search_time'],
        },
        {
          name: 'idx_analytics_search_checkin',
          fields: ['check_in_date', 'destination_id', 'destination_type', 'is_deleted'],
        },
        { name: 'idx_analytics_search_time', fields: ['search_time'] },
      ],
    }
  );

  return AnalyticsSearchLog;
};
