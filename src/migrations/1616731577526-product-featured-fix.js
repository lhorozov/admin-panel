const path = require('path');

const logger = require(path.resolve('config/logger'));
require(path.resolve('config/mongoMigrateConnection'));
const ProductModel = require('../model/ProductModel');
const LiveStreamModel = require('../model/LiveStreamModel');
const { StreamChannelStatus } = require('../lib/Enums');

/**
 * Make any changes you need to make to the database here
 */
async function up () {
  // Write migration here
  return LiveStreamModel.find({ status: StreamChannelStatus.FINISHED, "products.0": { $exists: true } })
    .then(async (liveStreams) => {
      const productIds = liveStreams.reduce((ids, stream) => ids = ids.concat(stream.products), []);
      if (productIds.length === 0) return 0;
      await ProductModel.updateMany({}, { isFeatured: 0 }); 
      return ProductModel.updateMany({ _id: { $in: productIds } }, { isFeatured: Date.now() }).then(() => productIds.length);
    })
    .then((count) => {
      logger.info(`[MIGRATE] updated ${count} Product documents to Mongo!`);
    })
    .catch((error) => {
      logger.error(error.message);
      throw error;
    });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down () {
  // Write migration here
  return ProductModel.updateMany({}, { isFeatured: false })
    .then(() => {
      logger.info(`[MIGRATE] updated Product documents to Mongo!`);
    })
    .catch((error) => {
      logger.error(error.message);
      throw error;
    });
}

module.exports = { up, down };
