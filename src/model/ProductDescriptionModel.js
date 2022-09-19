const { Schema, model } = require('mongoose');
const uuidField = require('./commonFields/UUIDField');
const createdAtField = require('./commonFields/CreatedAtField');


const collectionName = 'ProductDescription';

const schema = new Schema({
  ...uuidField(collectionName),
  ...createdAtField,
  product: {
    type: String,
    ref: 'Product',
  },
  en: {
    type: String,
  },
  ko: {
    type: String,
  },
  zh: {
    type: String,
  },
});

module.exports = new model(collectionName, schema);
