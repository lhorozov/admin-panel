/* eslint-disable no-param-reassign */
const path = require('path');
const { Promise } = require('bluebird');
const async = require('async');

const ProductService = require(path.resolve('src/lib/ProductService'));
const axios = require('axios');
const jsonFile = 'http://www.floatrates.com/daily/usd.json';

// const currencyServiceUrl = 'https://api.exchangeratesapi.io/latest';
// const currencyServiceUrl = 'https://api.exchangerate.host/latest';
// const { Currency } = require('../../../../../lib/Enums');

const { ErrorHandler } = require(path.resolve('src/lib/ErrorHandler'));
const errorHandler = new ErrorHandler();

const { CurrencyService } = require(path.resolve('src/lib/CurrencyService'));
const { CurrencyFactory } = require(path.resolve('src/lib/CurrencyFactory'));
const { LanguageList } = require(path.resolve('src/lib/Enums'));
const { translate } = require(path.resolve('src/lib/TranslateService'));
const languageList = LanguageList.toList();
async function exchangeOnSupportedCurrencies(price) {
  const currencies = CurrencyFactory.getCurrencies();

  const exchangePromises = currencies.map(async (currency) => {
    const amountOfMoney = CurrencyFactory.getAmountOfMoney({
      currencyAmount: price.amount, currency: price.currency,
    });

    if (price.currency === currency) {
      return { amount: amountOfMoney.getCentsAmount(), currency };
    }

    return CurrencyService.exchange(amountOfMoney, currency)
      .then((money) => ({ amount: money.getCentsAmount(), currency }));
  });

  return Promise.all(exchangePromises);
}

async function convertToUSD(price) {
  const amountOfMoney = CurrencyFactory.getAmountOfMoney({ currencyAmount: price.amount, currency: price.currency });
  if (price.currency && price.currency !== 'USD') {
    return CurrencyService.exchange(amountOfMoney, 'USD');
  }
  return amountOfMoney;
}

async function familyCategories(categoryIds, repository) {
  const categories = await repository.productCategory.findByIds(categoryIds);
  const parentIds = categories.reduce((acc, category) => acc = acc.concat([...category.siblings, category.id]), []);

  return repository.productCategory.load({ parent: { $in: parentIds } }, {})
    .then(async (children) => {
      const childIds = children.reduce((acc, child) => acc.concat([...child.siblings, child.id]), [])
        .filter((id, i, self) => self.indexOf(id) === i);
      if (childIds.length === 0) {
        return parentIds;
      }
      return parentIds.concat(await familyCategories(childIds, repository));
    });
}

module.exports = async (_, {
  filter, page, sort,
}, { user, dataSources: { repository } }) => {
  const pager = {
    limit: page.limit,
    skip: page.skip,
    total: 0,
  };
    
  if (user) {
    filter.blackList = user.blackList;
  }
  
  if (filter.categories) {
    const categories = [...filter.categories];
    filter.categories = await familyCategories(categories, repository);
  }
  
  filter = await ProductService.composeProductFilter(filter, user);

  if (filter.price) {
    if (filter.price.min) {
      const amount = await convertToUSD(filter.price.min);
      const cent = amount.getCentsAmount();
      filter.price.min1 = { amount: cent, currency: amount.getCurrency() };
    }

    if (filter.price.max) {
      const amount = await convertToUSD(filter.price.max);
      const cent = amount.getCentsAmount();
      filter.price.max1 = { amount: cent, currency: amount.getCurrency() };
    }
  }

  return Promise.all([
    repository.product.get({ filter, page, sort }),
    repository.product.getTotal(filter),
  ])
    .then(([collection, total]) => ({
      collection,
      pager: { ...pager, total },
    }))
    .catch((error) => {
      throw errorHandler.build([error]);
    });
};
