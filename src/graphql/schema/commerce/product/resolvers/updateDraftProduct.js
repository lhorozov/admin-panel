const path = require('path');
const { Validator } = require('node-input-validator');
const { ForbiddenError } = require('apollo-server');
const { CurrencyFactory } = require(path.resolve('src/lib/CurrencyFactory'));
const { CurrencyService } = require(path.resolve('src/lib/CurrencyService'));
const { ErrorHandler } = require(path.resolve('src/lib/ErrorHandler'));
const errorHandler = new ErrorHandler();

module.exports = async (_, { id, data }, { dataSources: { repository }, user }) => {
  const validator = new Validator({ ...data, id }, {
    id: ['required', ['regex', '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}']],
    title: 'required',
    status: 'required',
  });

  let product;

  validator.addPostRule(async (provider) => Promise.all([
    repository.product.getById(provider.inputs.id),
    provider.inputs.category ? repository.productCategory.getById(provider.inputs.category) : null,
    provider.inputs.brand ? repository.brand.getById(provider.inputs.brand) : null,
    provider.inputs.shippingBox ? repository.shippingBox.findOne(provider.inputs.shippingBox) : null,
  ])
    .then(([foundProduct, category, brand, shippingBox]) => {
      if (!foundProduct) {
        provider.error('id', 'custom', `Product with id "${provider.inputs.id}" doen not exist!`);
      }
      if (provider.inputs.category && !category) {
        provider.error('category', 'custom', `Category with id "${provider.inputs.category}" doen not exist!`);
      }
      if (provider.inputs.brand && !brand) {
        provider.error('brand', 'custom', `Brand with id "${provider.inputs.brand}" doen not exist!`);
      }
      if (provider.inputs.shippingBox && !shippingBox) {
        provider.error('shippingBox', 'custom', `Shipping Box with id "${provider.inputs.shippingBox}" does not exist!`);
      }
      product = foundProduct;
    }));

  return validator.check()
    .then(async (matched) => {
      if (!matched) {
        throw errorHandler.build(validator.errors);
      }
    })
    .then(() => {
      if (user.id !== product.seller) {
        throw new ForbiddenError('You can not update product!');
      }
    })
    .then(async () => {
      let customCarrier;
      if (data.customCarrier) {
        customCarrier = await repository.customCarrier.findByName(data.customCarrier);
        if (!customCarrier) {
          throw new ForbiddenError(`Can not find customCarrier with "${data.customCarrier}" name`);
        }
      }

      // other fields to update.
      ['title', 'description', 'price', 'currency',  'assets', 'category', 'brand', 'freeDeliveryTo', 'shippingBox', 'quantity', 'attrs', 'sku', 'status'].forEach(key => {
        product[key] = data[key] !== undefined ? data[key] : product[key];
      });
      product.oldPrice = data.discountPrice !== undefined ? data.discountPrice : product.oldPrice || 0;
      
      product.price = CurrencyFactory.getAmountOfMoney({ currencyAmount: product.price, currency: product.currency }).getCentsAmount();
      product.oldPrice = data.discountPrice ? CurrencyFactory.getAmountOfMoney({ currencyAmount: product.oldPrice, currency: product.currency }).getCentsAmount() : null;
      product.customCarrier = customCarrier ? customCarrier.id : null;
      product.customCarrierValue = customCarrier ? CurrencyFactory.getAmountOfMoney({ currencyAmount: data.customCarrierValue, currency: product.currency }).getCentsAmount() : 0;

      if (data.thumbnailId) {
        const thumbnail = await repository.asset.load(data.thumbnailId);
        if (thumbnail) { data.thumbnail = data.thumbnailId; } else { throw new ForbiddenError(`Thumbnail with id "${data.thumbnailId}" does not exist!`); }
      }

      const amountOfMoney = CurrencyFactory.getAmountOfMoney(
        { centsAmount: product.price, currency: product.currency },
      );
      const sortPrice = await CurrencyService.exchange(amountOfMoney, 'USD')
        .then((exchangedMoney) => exchangedMoney.getCentsAmount());
      product.sortPrice = sortPrice;

      return Promise.all([
        product.save(),
      ])
        .then(async ([updatedProduct]) => updatedProduct);
    });
};
