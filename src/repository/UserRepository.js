const path = require('path');
// const stream = require('getstream');
const md5 = require('md5');

const { Currency, PushNotification, MeasureSystem, LanguageList } = require(path.resolve('src/lib/Enums'));
const UserService = require(path.resolve('src/lib/UserService'));


function elasticFilter(filter) {
  const emptyQuery = {};
  const query = {
    $and: [],
  };
  if (filter) {
    query.$and.push({
      $or: [
        { email: { $regex: `^.*${filter}.*`, $options: 'i' } },
        { name: { $regex: `^.*${filter}.*`, $options: 'i' } },
      ]
    })
  }
  return query.$and.length > 0 ? query : emptyQuery;
}

function transformSortInput({ feature, type }) {
  const availableFeatures = {
    CREATED_AT: 'createdAt',
  };

  const availableTypes = {
    DESC: -1,
    ASC: 1,
  };

  if (typeof availableFeatures[feature] === 'undefined') {
    throw Error(`Sorting by "${feature}" feature is not provided.`);
  }

  if (typeof availableTypes[type] === 'undefined') {
    throw Error(`Sorting type "${feature}" is not provided.`);
  }

  return { [availableFeatures[feature]]: availableTypes[type] };
}

function applyFilter(query, filter) {
  if (Object.keys(filter) == 0) {
    return query;
  }

  const {
    searchQuery, language, currency, zipcode, country, name, useremail, phone, userID, seller,
  } = filter;

  query.$and = [];

  if (searchQuery) {
    query.$and.push({
      $or: [
        { name: { $regex: `^.*${searchQuery}.*`, $options: 'i' } },
      ],
    });
  }

  if (language) {
    query.$and.push({
      'settings.language': { $in: language },
    });
  }

  if (currency) {
    query.$and.push({
      'settings.currency': { $in: currency },
    });
  }

  if (zipcode) {
    query.$and.push({
      'settings.zipCode': { $in: zipcode },
    });
  }

  if (country) {
    query.$and.push({
      'settings.country': { $in: country },
    });
  }

  if (useremail) {
    query.$and.push({
      email: useremail,
    });
  }

  if (name) {
    query.$and.push({
      name,
    });
  }

  if (phone) {
    query.$and.push({
      phone,
    });
  }

  if (userID) {
    query.$and.push({
      _id: userID,
    });
  }

  if (seller && seller == true) {
    query.$and.push({
      organization: { $exists: true },
    });
  } else if (seller !== null && seller == false) {
    query.$and.push({
      organization: { $exists: false },
    });
  }
}

class UserRepository {
  constructor(model) {
    this.model = model;
  }

  async getById(id) {
    return this.model.findOne({ _id: id });
  }

  /**
   * @deprecated
   */
  async load(id) {
    return this.model.findOne({ _id: id });
  }

  async getById(id) {
    return this.model.findOne({ _id: id });
  }

  async loadList(ids) {
    return this.model.find({ _id: { $in: ids } });
  }

  async loadAll(query = {}) {
    return this.model.find(query);
  }

  async countAll(query = {}) {
    return this.model.countDocuments(query);
  }

  async create(data, options = {}) {
    const {
      email,
      ...userProperties
    } = data;

    data = { email: email.toLowerCase(), ...userProperties };

    if (!data.email) {
      throw Error('Email is required!');
    }

    if (!data.password) {
      throw Error('Password is required!');
    }

    if (data.email && await this.findByEmail(data.email)) {
      throw Error(`Email "${data.email}" is already taken!`);
    }

    const user = new this.model({
      _id: data._id,
      email: data.email,
      password: md5(data.password),
      roles: options.roles || [],
      color: UserService.generateColorPair(),
      settings: {
        pushNotifications: PushNotification.toList(),
        language: LanguageList.ENG,
        currency: Currency.USD,
        measureSystem: MeasureSystem.USC,
      },
    });

    return user.save();
  }

  async createNewUser(data, options = {}) {
    const {
      email,
      ...userProperties
    } = data;

    data = { email: email.toLowerCase(), ...userProperties };

    if (!data.email) {
      throw Error('Email is required!');
    }

    if (!data.password) {
      throw Error('Password is required!');
    }

    if (!data.phone) {
      throw Error('Phone number is required!');
    }

    if (data.email && await this.findByEmail(data.email)) {
      throw Error(`Email "${data.email}" is already taken!`);
    }

    const user = new this.model({
      _id: data._id,
      email: data.email,
      phone: data.phone,
      name: data.name,
      password: md5(data.password),
      roles: options.roles || [],
      photo: data.photo,
      location: data.location,
      address: data.address,
      settings: {
        pushNotifications: PushNotification.toList(),
        language: data.language,
        currency: data.currency,
        measureSystem: MeasureSystem.USC,
      },
    });

    return user.save();
  }

  async createByPhone(data, options = {}) {
    if (!data.phone) {
      throw Error('phone is required!');
    }

    if (!data.countryCode) {
      throw Error('countryCode is required!');
    }

    if (data.phone && await this.findByPhone(data.phone)) {
      throw Error(`Phone Number "${data.phone}" is already taken!`);
    }

    const user = new this.model({
      _id: data._id,
      email: data.email,
      password: md5(data.password),
      phone: data.phone,
      roles: options.roles || [],
      settings: {
        pushNotifications: PushNotification.toList(),
        language: LanguageList.ENG,
        currency: Currency.USD,
        measureSystem: MeasureSystem.USC,
      },
      address: {
        country: data.countryCode,
      },
    });

    return user.save();
  }

  async createFromCsv(data, options = {}) {
    const {
      email,
      ...userProperties
    } = data;

    data = { email: email.toLowerCase(), ...userProperties };

    if (!data.email) {
      throw Error('Email is required!');
    }

    if (!data.password) {
      throw Error('Password is required!');
    }

    if (data.email && await this.findByEmail(data.email)) {
      throw Error(`Email "${data.email}" is already taken!`);
    }

    const user = new this.model({
      _id: data._id,
      email: data.email,
      photo: data.photo.id,
      password: md5(data.password),
      phone: data.number,
      name: data.name,
      roles: data.roles || [],
      address: data.address,
      location: data.location,
      settings: {
        pushNotifications: PushNotification.toList(),
        language: data.settings.language,
        currency: data.settings.currency,
        measureSystem: data.settings.measureSystem,
      },
      phone: data.phone
    });

    return user.save();
  }

  async createByProvider(data, options = {}) {
    const {
      email,
      ...userProperties
    } = data;

    data = { email: email ? email.toLowerCase() : null, ...userProperties };
    // if (!data.email) {
    //   throw Error('Email is required!');
    // }

    if (data.email && await this.findByEmail(data.email)) {
      throw Error(`Email "${data.email}" is already taken!`);
    }
    let user;
    if(!data.email) {
      user = new this.model({
        _id: data._id,
        name: data.name,
        photo: data.photo,
        roles: options.roles || [],
        settings: {
          pushNotifications: PushNotification.toList(),
          language: LanguageList.ENG,
          currency: Currency.USD,
          measureSystem: MeasureSystem.USC,
        },
        providers: { [data.provider]: data.providerId },
      });
    } else {
      user = new this.model({
        _id: data._id,
        email: data.email,
        name: data.name,
        photo: data.photo,
        roles: options.roles || [],
        settings: {
          pushNotifications: PushNotification.toList(),
          language: LanguageList.ENG,
          currency: Currency.USD,
          measureSystem: MeasureSystem.USC,
        },
        providers: { [data.provider]: data.providerId },
      });
    }
    return user.save();
  }

  async update(id, data) {
    const {
      email,
      ...userProperties
    } = data;

    data = { email, ...userProperties };

    const user = await this.load(id);
    if (!user) {
      throw Error(`User "${id}" does not exist!`);
    }

    user.email = (!user.email && data.email) ? (data.email).toLowerCase() : user.email;
    user.name = data.name || user.name;
    user.phone = data.phone || user.phone;
    user.photo = data.photo || user.photo;
    user.location = data.location || user.location;
    user.address = data.address || user.address;
    user.settings.currency = data.currency || user.settings.currency;
    user.settings.language = data.language || user.settings.language;
    user.fee = data.fee / 100 || user.fee;
    user.gender = data.gender || user.gender;
    user.color = data.color || user.color;

    if (data.provider && data.providerId) {
      user.providers[data.provider] = data.providerId;
    }

    return user.save();
  }

  async setOnlineState(userId, status) {
    return this.model.findOneAndUpdate(
      { _id: userId },
      { $set: { isOnline: status } },
      { new: true },
    );
  }

  async updateCurrency(id, currency) {
    const user = await this.load(id);
    if (!user) {
      throw Error(`User "${id}" does not exist!`);
    }

    user.settings.currency = currency;

    return user.save();
  }

  async updateSettings(id, settings) {
    const user = await this.load(id);
    if (!user) {
      throw Error(`User "${id}" does not exist!`);
    }

    user.settings = settings;

    return user.save();
  }

  async updateLangSetting(id, langCode) {
    const user = await this.load(id);
    if (!user) {
      throw Error(`user "${id}" does not exist!`);
    }
    user.settings.language = langCode;
    return user.save();
  }

  async updateEmailAndPassword(id, data) {
    const user = await this.load(id);
    if (!user) {
      throw Error(`User "${id}" does not exist!`);
    }

    user.email = data.email;
    user.password = md5(data.password);

    return user.save();
  }

  async findByEmailAndPassword({ email, password }) {
    const query = {
      password: md5(password),
      email: email.toLowerCase(),
    };

    return this.model.findOne(query);
  }

  async findByPhoneAndPassword({ phone, password }) {
    const query = {
      password: md5(password),
      phone: phone,
    };

    return this.model.findOne(query);
  }

  async findByEmail(email) {
    email = email.toLowerCase();
    return this.model.findOne({ email });
  }
  async findById(_id) {
    return this.model.findOne({ _id });
  }
  async findByPhone(phone) {
    return this.model.findOne({ phone });
  }

  async findByName(name) {
    return this.model.findOne({ name });
  }

  async findByProvider(provider, value) {
    return await this.model.findOne({ [`providers.${provider}`]: value });
  }

  async findByAnonymousId(anonymousId) {
    return this.model.findOne({ anonymousId });
  }

  async changePassword(userId, password) {
    return this.model.findOneAndUpdate(
      { _id: userId },
      { $set: { password: md5(password) } },
      { new: true },
    );
  }

  async approveEmail(userId) {
    return this.model.findOneAndUpdate(
      { _id: userId },
      { $set: { isApprovedEmail: true } },
      { new: true },
    );
  }

  async changeDeviceId(userId, device_id) {
    return this.model.update(
      { _id: userId },
      { $set: { device_id } },
    );
  }

  async addToBlackList(userId, reportedId) {
    return this.model.update(
      { _id: userId },
      { $push: { blackList: reportedId } },
    );
  }

  async es_search(filter, page) {
    return this.model.find(
        elasticFilter(filter),
        null,
        {
          limit: page.limit,
          skip: page.skip,
        },
    );
  }

  async getTotal_es(filter) {
    return this.model
      .countDocuments(
        elasticFilter(filter),
      );
  }

  async get({ filter, sort, page }) {
    const query = {};

    applyFilter(query, filter);

    return this.model.find(
      query,
      null,
      {
        sort: transformSortInput(sort),
        limit: page.limit,
        skip: page.skip,
      },
    );
  }

  async getTotal(filter) {
    const query = {};
    applyFilter(query, filter);
    return this.model.countDocuments(query);
  }

  async deleteUser(id) {
    return this.model.remove({ _id: id });
  }

  async updateOrganization(userID, org) {
    return this.model.findOne({ _id: userID, organization: org.id })
      .then(async (user) => {
        if (user) { return user; }

        const newUser = await this.getById(userID);
        newUser.organization = org.id;
        return newUser.save();
      });
  }

  async paginate({ query, page }) {
    return this.model.find(
      query,
      null,
      {
        limit: page.limit,
        skip: page.skip,
      },
  );
  }
}

module.exports = UserRepository;
