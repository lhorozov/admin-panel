const uuid = require('uuid/v4');
const path = require('path');
const { Validator } = require('node-input-validator');

const { Currency } = require(path.resolve('src/lib/Enums'));
const { CurrencyFactory } = require(path.resolve('src/lib/CurrencyFactory'));

const { ErrorHandler } = require(path.resolve('src/lib/ErrorHandler'));
const { ForbiddenError } = require('apollo-server');

const errorHandler = new ErrorHandler();

module.exports = async (_, { data }, { dataSources: { repository }, user }) => {
  const validator = new Validator(data, {
    title: 'required',
    status: 'required',
  });

  // fill in some default values;
  data.price = data.price || 0;
  data.discountPrice = data.discountPrice || data.price;
  data.currency = data.currency || user.settings.currency || Currency.USD;
  data.quantity = data.quantity || 0;

  validator.addPostRule(async (provider) => Promise.all([
    data.category ? repository.productCategory.getById(provider.inputs.category) : null,
    data.brand ? repository.brand.getById(provider.inputs.brand) : null,
    data.shippingBox ? repository.shippingBox.findOne(provider.inputs.shippingBox) : null,
    data.thumbnailId ? repository.asset.load(provider.inputs.thumbnailId) : null,
  ]).then(([category, brand, shippingBox, thumbnail]) => {
    if (data.category && !category) {
      provider.error('category', 'custom', `Category with id "${provider.inputs.category}" does not exist!`);
    }
    if (data.brand && !brand) {
      provider.error('brand', 'custom', `Brand with id "${provider.inputs.brand}" does not exist!`);
    }
    if (data.shippingBox && !shippingBox) {
      provider.error('shippingBox', 'custom', `Shipping Box with id "${provider.inputs.shippingBox}" does not exist!`);
    }
    if (!thumbnail && data.thumbnailId) {
      provider.error('thumbnailId', 'custom', `Thumbnail with id "${provider.inputs.thumbnailId}" does not exist!`);
    }
  }));

  return validator.check()
    .then(async (matched) => {
      if (!matched) {
        throw errorHandler.build(validator.errors);
      }

      let customCarrier;
      if (data.customCarrier) {
        customCarrier = await repository.customCarrier.findByName(data.customCarrier);
        if (!customCarrier) {
          throw new ForbiddenError(`Can not find customCarrier with "${data.customCarrier}" name`);
        }
      }

      const productId = uuid();

      const {
        discountPrice, thumbnailId, ...productData
      } = data;

      productData._id = productId;
      productData.seller = user.id;
      productData.customCarrier = customCarrier ? customCarrier.id : null;
      productData.customCarrierValue = CurrencyFactory.getAmountOfMoney({ currencyAmount: data.customCarrierValue || 0, currency: data.currency }).getCentsAmount();
      productData.price = CurrencyFactory.getAmountOfMoney({ currencyAmount: data.price, currency: data.currency }).getCentsAmount();
      if (thumbnailId) { productData.thumbnail = thumbnailId; }
      productData.oldPrice = data.discountPrice ? CurrencyFactory.getAmountOfMoney({ currencyAmount: data.discountPrice, currency: data.currency }).getCentsAmount() : null;

      // options
      productData.attrs = [];

      const amountOfMoney = CurrencyFactory.getAmountOfMoney({ currencyAmount: data.price, currency: data.currency });
      let sortPrice = amountOfMoney.getCentsAmount();

      if (data.currency !== Currency.USD) {
        sortPrice = await repository.sortPriceRate.load(data.currency)
          .then((rate) => {
            if (rate) { return Math.floor(sortPrice / rate.rate); }
          });
      }
      productData.sortPrice = sortPrice;
      return Promise.all([
        repository.product.create(productData),
      ])
        .then(async ([product]) => product);
    });
};
