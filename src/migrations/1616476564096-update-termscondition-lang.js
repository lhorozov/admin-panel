const path = require('path');

require(path.resolve('config/mongoMigrateConnection'));

const logger = require(path.resolve('config/logger'));
const TermsConditionModel = require('../model/TermsConditionModel');

/**
 * Make any changes you need to make to the database here
 */
async function up () {
  const langMap = [
    { old: 'ENG', new: 'EN' },
    { old: 'CHI', new: 'ZH' },
    { old: 'IND', new: 'ID' },
    { old: 'JPN', new: 'JA' },
  ];
  return Promise.all(langMap.map(map => TermsConditionModel.updateMany({ language: map.old }, { language: map.new })))
    .then(() => {
      logger.info(`[MIGRATE] updated Terms & Conditions languages!`);
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
  return TermsConditionModel.remove({ name: /.*/ })
  .then((res) => {
    logger.info(`[MIGRATE] removed ${res.deletedCount} Terms & Conditions documents from Mongo!`);
  })
  .catch((error) => {
    logger.error(error.message);
    throw error;
  }); 
}

module.exports = { up, down };
