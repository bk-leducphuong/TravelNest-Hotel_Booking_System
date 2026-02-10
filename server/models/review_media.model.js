const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const ReviewMedia = sequelize.define(
    'review_media',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      review_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'reviews', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      media_type: {
        type: DataTypes.ENUM('image', 'video'),
        allowNull: false,
        defaultValue: 'image',
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'URL or storage path of the media',
      },
      thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Thumbnail URL for videos or large images',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
    },
    {
      sequelize,
      tableName: 'review_media',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_review_id',
          using: 'BTREE',
          fields: [{ name: 'review_id' }],
        },
        {
          name: 'idx_review_order',
          using: 'BTREE',
          fields: [{ name: 'review_id' }, { name: 'display_order' }],
        },
      ],
    }
  );

  ReviewMedia.associate = function (models) {
    ReviewMedia.belongsTo(models.reviews, { foreignKey: 'review_id', as: 'review' });
  };

  return ReviewMedia;
};
