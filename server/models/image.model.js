const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Image = sequelize.define(
    'images',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      entity_type: {
        type: DataTypes.ENUM('hotel', 'user_avatar', 'room', 'review'),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      // MinIO storage information
      bucket_name: {
        type: DataTypes.STRING(63),
        allowNull: false,
      },
      object_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      // Image metadata
      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      file_size: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Variants (thumbnails, compressed versions)
      has_thumbnail: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      has_compressed: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      // Ordering and status
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'processing', 'deleted'),
        allowNull: true,
        defaultValue: 'processing',
      },
      // Timestamps
      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'images',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_entity',
          using: 'BTREE',
          fields: [{ name: 'entity_type' }, { name: 'entity_id' }, { name: 'status' }],
        },
        {
          name: 'idx_bucket_key',
          using: 'BTREE',
          fields: [{ name: 'bucket_name' }, { name: 'object_key' }],
        },
        {
          name: 'unique_primary',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'entity_type' },
            { name: 'entity_id' },
            { name: 'is_primary' },
            { name: 'status' },
          ],
        },
      ],
    }
  );

  Image.associate = function (models) {
    // Image variants association (thumbnail, small, medium, large, *_webp, etc.)
    Image.hasMany(models.image_variants, {
      foreignKey: 'image_id',
      as: 'image_variants',
    });
  };

  return Image;
};
