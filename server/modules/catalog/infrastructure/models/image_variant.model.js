const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const ImageVariant = sequelize.define(
    'image_variants',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      image_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'images',
          key: 'id',
        },
      },
      variant_type: {
        type: DataTypes.ENUM(
          'thumbnail',
          'small',
          'medium',
          'large',
          'thumbnail_webp',
          'small_webp',
          'medium_webp',
          'large_webp'
        ),
        allowNull: false,
      },
      bucket_name: {
        type: DataTypes.STRING(63),
        allowNull: false,
      },
      object_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_size: {
        type: DataTypes.BIGINT,
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'image_variants',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_image_variant',
          using: 'BTREE',
          fields: [{ name: 'image_id' }, { name: 'variant_type' }],
        },
        {
          name: 'image_id',
          using: 'BTREE',
          fields: [{ name: 'image_id' }],
        },
      ],
    }
  );

  ImageVariant.associate = function (models) {
    ImageVariant.belongsTo(models.images, {
      foreignKey: 'image_id',
      onDelete: 'CASCADE',
    });
  };

  return ImageVariant;
};
