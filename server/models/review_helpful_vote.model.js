const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const ReviewHelpfulVote = sequelize.define(
    'review_helpful_votes',
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      is_helpful: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'True = helpful, False = not helpful',
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
      tableName: 'review_helpful_votes',
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
          name: 'idx_review_user_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'review_id' }, { name: 'user_id' }],
          comment: 'One vote per user per review',
        },
        {
          name: 'idx_review_id',
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

  ReviewHelpfulVote.associate = function (models) {
    ReviewHelpfulVote.belongsTo(models.reviews, { foreignKey: 'review_id', as: 'review' });
    ReviewHelpfulVote.belongsTo(models.users, { foreignKey: 'user_id', as: 'user' });
  };

  return ReviewHelpfulVote;
};
