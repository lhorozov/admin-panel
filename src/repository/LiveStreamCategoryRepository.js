function getSearchQueryByName(query) {
  return { name: { $regex: `^${query}.*`, $options: 'i' } };
}

class LiveStreamCategoryRepository {
  constructor(model) {
    this.model = model;
  }

  async searchByName(query, { skip, limit }) {
    return this.model.find(
      getSearchQueryByName(query),
      null,
      {
        limit,
        skip,
      },
    );
  }

  async getCountBySearch(query) {
    return this.model.countDocuments(getSearchQueryByName(query));
  }

  async getById(id) {
    return this.model.findOne({ _id: id });
  }

  async getByName(name) {
    return this.model.findOne({ name });
  }

  async getBySlug(slug) {
    return this.model.findOne({ slug });
  }

  async getByIds(ids) {
    return this.model.find({_id: ids});
  }

  async getAll(query = {}) {
    return this.model.find(query).sort('order');
  }
}

module.exports = LiveStreamCategoryRepository;
