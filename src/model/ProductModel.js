const { Schema, model } = require('mongoose');
require('mongoose-long')(require('mongoose'));
const { Currency, WeightUnitSystem, MarketType, ProductMetricUnits, ProductStatus } = require('../lib/Enums');
const uuidField = require('./commonFields/UUIDField');
const createdAtField = require('./commonFields/CreatedAtField');

const collectionName = 'Product';

let SchemaTypes = Schema.Types;

const productMetricItemSchema = new Schema({
  metricUnit: {
    type: String,
    enum: ProductMetricUnits.toList(),
  },
  minCount: Number,
  unitPrice: {
    amount: Number,
    currency: {
      type: String,
      enum: Currency.toList(),
    }
  },
  quantity: Number
}, { _id: false });

const schema = new Schema({
  ...uuidField(collectionName),
  ...createdAtField,
  seller: {
    type: String,
    ref: 'User',
    index: true,
  },
  title: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    index: true,
  },
  price: {
    type: Number,
    required: true,
    index: true,
  },
  oldPrice: {
    type: Number,
  },
  sortPrice: {
    type: Number,
    required: true,
    index: true,
  },
  currency: {
    type: String,
    enum: Currency.toList(),
  },
  assets: [{
    type: String,
    ref: 'Asset',
  }],
  thumbnail: {
    type: String,
    ref: 'Asset',
  },
  category: {
    type: String,
    ref: 'ProductCategory',
    index: true,
    // required: true,
  },
  brand: {
    type: String,
    ref: 'Brand',
    index: true,
  },
  customCarrier: {
    type: String,
    ref: 'CustomCarrier',
  },
  customCarrierValue: {
    type: Number,
  },
  freeDeliveryTo: [{
    type: String,
    enum: MarketType.toList(),
    required: true,
  }],
  // weight: {
  //   type: {
  //     value: {
  //       type: Number,
  //       required: true,
  //     },
  //     unit: {
  //       type: String,
  //       enum: WeightUnitSystem.toList(),
  //       required: true,
  //     },
  //   },
  // },
  shippingBox: {
    type: String,
    ref: 'ShippingBox',
    index: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  quantity: {
    type: Number,
    validate: {
      validator: Number.isInteger,
      message: `Quantity {VALUE} is not an integer value!`,
    },
  },
  attrs: [{
    type: String,
    ref: 'ProductAttributes',
  }],
  metrics: [productMetricItemSchema],
  wholesaleEnabled: {
    type: Boolean,
    default: false,
  },
  sku: {
    type: String,
    default: null,
    unique: true,
  },
  status: {
    type: String,
    enum: ProductStatus.toList(),
    default: ProductStatus.ACTIVE,
  },
  
  isFeatured: {
    type: Number,
    default: 0,
  },
  slug: {
    type: String
  },
  metaDescription: {
    type: String,
  },
  metaTags: [{
    type: String
  }],
  seoTitle: {
    type: String
  },
  sold: {
    type: Number,
    default: 0,
  },
  hashtags: {
    type: [{
      type: String,
    }],
    default: [],
    index: true,
  },
  href: {
    type: String,
  }
});

schema.indexes([
  { currency: 1, price: 1 },
]);

schema.methods.getTagName = function getTagName() {
  return `${collectionName}:${this._id}`;
};

module.exports = new model(collectionName, schema);
