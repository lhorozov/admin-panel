const path = require('path');

const logger = require(path.resolve('config/logger'));
require(path.resolve('config/mongoMigrateConnection'));
const ProductModel = require('../model/ProductModel');
const ProductTranslationModel = require('../model/ProductTranslationModel');

const ALREADY_DONE = 100;

/**
 * Make any changes you need to make to the database here
 */
async function up () {
  // Write migration here
  return ProductTranslationModel.find({})
    .then((translations) => ProductModel.updateMany({ _id: { $in: translations.map(it => it.product) } }, { translated: ALREADY_DONE }))
    .then((count) => {
      logger.info(`[MIGRATE] marked ${count} Product documents as translated in the past!`);
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
  return ProductModel.updateMany({}, { translated: 0 })
    .then(() => {
      logger.info(`[MIGRATE] marked all Product documents as not translated!`);
    })
    .catch((error) => {
      logger.error(error.message);
      throw error;
    });
}

module.exports = { up, down };
