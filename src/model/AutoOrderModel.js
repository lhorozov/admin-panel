const { Schema, model } = require('mongoose');
const uuidField = require('./commonFields/UUIDField');
const createdAtField = require('./commonFields/CreatedAtField');
const { AutoOrderStatus } = require('../lib/Enums');

const collectionName = 'AutoOrder';

const schema = new Schema({
    ...uuidField(collectionName),
    ...createdAtField,
  
    productInfo: {
        type: Object,
        required: true,
    },
    buyer: {
        type: Object,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: AutoOrderStatus.toList(),
        default: AutoOrderStatus.SUCCESS,
    },
    responseMSG: {
        type: String,
    },
    updateAt: {
        type: Date,
        default: Date.now,
    }
});
  
module.exports = new model(collectionName, schema);