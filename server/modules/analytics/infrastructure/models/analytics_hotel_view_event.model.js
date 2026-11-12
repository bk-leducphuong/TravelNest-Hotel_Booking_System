module.exports = function (sequelize, DataTypes) {
  const AnalyticsHotelViewEvent = sequelize.define(
    'analytics_hotel_view_events',
    {
      event_id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
      hotel_id: { type: DataTypes.CHAR(36), allowNull: false },
      user_id: { type: DataTypes.CHAR(36), allowNull: true },
      session_id: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      viewed_at: { type: DataTypes.DATE(3), allowNull: false },
      ip_address: { type: DataTypes.STRING(45), allowNull: false, defaultValue: '' },
      user_agent: { type: DataTypes.STRING(512), allowNull: false, defaultValue: '' },
      created_at: { type: DataTypes.DATE(3), allowNull: false },
      updated_at: { type: DataTypes.DATE(3), allowNull: false },
    },
    {
      tableName: 'analytics_hotel_view_events',
      timestamps: false,
      // Owned by the Go analytics service; Node only seeds it in development.
      indexes: [
        { name: 'idx_analytics_view_hotel_time', fields: ['hotel_id', 'viewed_at'] },
        { name: 'idx_analytics_view_time_hotel', fields: ['viewed_at', 'hotel_id'] },
      ],
    }
  );

  return AnalyticsHotelViewEvent;
};
