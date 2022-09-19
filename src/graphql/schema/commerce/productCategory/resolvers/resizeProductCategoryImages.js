const path = require('path');
const { AssetService } = require(path.resolve('src/lib/AssetService'));
const { ErrorHandler } = require(path.resolve('src/lib/ErrorHandler'));
const errorHandler = new ErrorHandler();


module.exports = async (_, { data }, { dataSources: { repository }, user }) => {
  const { skip, limit, height, width } = data;
  let result = {
    total: 0,
    success: 0,
    failed: 0,
    failedList: {
      ids: [],
      errors: [],
    },
  };
  return repository.productCategory.load({}, { skip, limit })
    .then(async categories => {
      result.total = categories.length;
      await Promise.all(categories.map(category => {
        return AssetService.resizeImage({
          assetId: category.image,
          width,
          height,
          updatePath: false,  // overwrite the existing file.
        })
        .then(resized => {
          result.success ++;
        })
        .catch(error => {
          result.failed ++;
          result.failedList.ids.push(category.image);
          result.failedList.errors.push(error.message);
        })
      }))
    })
    .then(() => result)
    .catch((error) => {
      result.failedList.errors = [ error.message ];
      return result;
    })
}
