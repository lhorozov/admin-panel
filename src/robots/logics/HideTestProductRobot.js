/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
const path = require('path');
const NodeCache = require('node-cache');

const BaseRobot = require('./BaseRobot');

const logger = require(path.resolve('config/logger'));
const { robots } = require(path.resolve('config'));
const { updateProductCountInCategory, updateProductCountInBrand } = require('../../lib/ProductService');

const { ProductStatus } = require(path.resolve('src/lib/Enums'));
const ProductModel = require(path.resolve('src/model/ProductModel'));
const cache = new NodeCache();

const HIDE_KEYWORD = 'TEST';

const activity = {
  shouldWork: () => {
    const time = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' });
    const hh = Number(time.split(':')[0]);
    const mm = Number(time.split(':')[1]);
    return (hh % 3 === 0) && (mm >= 10 || mm < 20);
  },
};

module.exports = class HideTestProductRobot extends BaseRobot {
  constructor() {
    super(10 * 60 * 1000);
  }

  execute() {
    if (!activity.shouldWork()) return false;
    return ProductModel.find({
      title: { $regex: `^${HIDE_KEYWORD}`, $options: 'i' },
      status: { $in: [ProductStatus.ACTIVE] },
      isDeleted: false,
    })
      .then(async (products) => {
        console.log('[Products]', products.map((it) => it.id));
        await ProductModel.updateMany({ _id: { $in: products.map((product) => product._id) } }, { isDeleted: true });
        const categoryIds = products.map((product) => product.category).filter((value, index, self) => self.indexOf(value) === index);
        await Promise.all(categoryIds.map((categoryId) => updateProductCountInCategory(categoryId)));

        const brandIds = products.map((product) => product.brand).filter((value, index, self) => self.indexOf(value) === index);
        await Promise.all(brandIds.map((brandId) => updateProductCountInBrand(brandId)));
      })
      .then(() => {
        logger.info('[HideTestProductRobot] Logic was executed');
        // super.execute();
      });
  }
};
