const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const ReviewReply = sequelize.define(
    'review_replies',
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
        unique: true,
        references: { model: 'reviews', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'One reply per review',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Hotel manager or admin who replied',
      },
      reply_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'review_replies',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_review_id_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'review_id' }],
        },
        {
          name: 'idx_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
      ],
    }
  );

  ReviewReply.associate = function (models) {
    ReviewReply.belongsTo(models.reviews, {
      foreignKey: 'review_id',
      as: 'review',
    });
    ReviewReply.belongsTo(models.users, { foreignKey: 'user_id', as: 'user' });
  };

  return ReviewReply;
};
