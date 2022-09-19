const path = require('path');
const async = require('async');

const { translate } = require(path.resolve('src/lib/TranslateService'));
const { LanguageList } = require(path.resolve('src/lib/Enums'));

module.exports = async (_, { data }, { dataSources: { repository } }) => {
  const products = await repository.product.getAll();
  const languageList = LanguageList.toList();

  const title = {};
  const description = {};

  await async.eachLimit(products, 2, async (product, cb) => {
    await Promise.all(languageList.map(async (language) => {
      const tt = await translate(language.toLowerCase(), product.title);
      const dd = await translate(language.toLowerCase(), product.description);

      title[language.toLowerCase()] = tt || product.title;
      description[language.toLowerCase()] = dd || product.description;
    }));

    const translatedProduct = await repository.productTranslation.getByProduct(product.id);

    if (translatedProduct) {
      await repository.productTranslation.updateProduct(product.id, { title, description });
    } else {
      await repository.productTranslation.addNewProduct({ product: product.id, title, description });
    }
    // eslint-disable-next-line no-unused-expressions
    cb && cb(null);
  });

  return true;
};
