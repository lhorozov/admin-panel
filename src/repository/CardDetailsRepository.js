const uuid = require('uuid/v4');

class CardDetailsRepository {
  constructor(model) {
    this.model = model;
  }

  async getById(id) {
    return this.model.findOne({ _id: id });
  }

  async create(data) {
    const card = new this.model({
      _id: uuid(),
      ...data,
    });
    return card.save();
  }

  async update(data, isAdminCard = false) {
    const card = isAdminCard ? await this.getAdminCardInfo() : await this.getById(data.id);

    card.name = data.name ? data.name : card.name;
    card.exp_month = data.exp_month ? data.exp_month : card.exp_month;
    card.exp_year = data.exp_year ? data.exp_year : card.exp_year;
    card.number = data.number ? data.number : card.number;
    card.cvc = data.cvc ? data.cvc : card.cvc;

    return card.save();
  }

  async delete(id) {
      return this.model.remove({_id: id});
  }

  async getAdminCardInfo() {
    return this.model.findOne({ isAdmin: true });
  }

}

module.exports = CardDetailsRepository;
