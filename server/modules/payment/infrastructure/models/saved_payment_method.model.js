const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const SavedPaymentMethod = sequelize.define(
    'saved_payment_methods',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User who owns the saved payment method.',
      },
      stripe_customer_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Stripe customer the payment method is attached to.',
      },
      stripe_payment_method_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: 'saved_payment_methods_pm_id_UNIQUE',
        comment: 'Stripe PaymentMethod ID (pm_xxx).',
      },
      brand: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Card brand, e.g. visa or mastercard.',
      },
      last4: {
        type: DataTypes.STRING(4),
        allowNull: true,
        comment: 'Last four digits of the card.',
      },
      exp_month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Card expiration month (1-12).',
      },
      exp_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Card expiration year (four digits).',
      },
      cardholder_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Name printed on the card.',
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Mirror of the Stripe customer default; single default enforced in app code.',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional saved payment method metadata.',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row creation timestamp.',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row last update timestamp.',
      },
    },
    {
      sequelize,
      tableName: 'saved_payment_methods',
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
          name: 'saved_payment_methods_pm_id_UNIQUE',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'stripe_payment_method_id' }],
        },
        {
          name: 'idx_saved_payment_methods_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
        {
          name: 'idx_saved_payment_methods_user_default',
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'is_default' }],
        },
      ],
    }
  );

  SavedPaymentMethod.associate = function (models) {
    SavedPaymentMethod.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return SavedPaymentMethod;
};
