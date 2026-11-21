const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Invoice = sequelize.define(
    'invoices',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id',
        },
        comment: 'Transaction this invoice documents.',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        comment: 'Hotel the invoice is issued for.',
      },
      invoice_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Human-readable invoice number',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total invoice amount including tax.',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'ISO 4217 three-letter currency code.',
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: 'Tax portion of the invoice total.',
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Invoice amount before tax is applied.',
      },
      status: {
        type: DataTypes.ENUM(
          'draft',
          'issued',
          'paid',
          'partially_paid',
          'overdue',
          'cancelled',
          'void'
        ),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Current lifecycle status of the invoice.',
      },
      due_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date by which the invoice must be paid.',
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the invoice was issued to the customer.',
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the invoice was fully paid.',
      },
      invoice_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to download/view invoice PDF',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Free-form notes shown on the invoice.',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional invoice metadata.',
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
      tableName: 'invoices',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'invoice_number_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'invoice_number' }],
        },
        {
          name: 'transaction_id',
          using: 'BTREE',
          fields: [{ name: 'transaction_id' }],
        },
        {
          name: 'hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
      ],
    }
  );

  Invoice.associate = function (models) {
    Invoice.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
    Invoice.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
  };

  return Invoice;
};
