const { stream } = require("../../../../config/logger")

module.exports = {
  updateProductFeatured: async (streamId, repository) => {
    return repository.liveStream.load(streamId)
      .then((liveStream) => repository.product.getByIds(liveStream.products || []))
      .then((products) => Promise.all(products.map((product) => {
        product.isFeatured = Date.now();
        return product.save();
      })));       
  },
}
