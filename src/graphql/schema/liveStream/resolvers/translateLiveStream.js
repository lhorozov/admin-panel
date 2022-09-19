const path = require('path');
const async = require('async');

const { translate } = require(path.resolve('src/lib/TranslateService'));
const { LanguageList } = require(path.resolve('src/lib/Enums'));

module.exports = async (_, { data }, { dataSources: { repository } }) => {
  const livestreams = await repository.liveStream.getAll({});
  const languageList = LanguageList.toList();

  const title = {};

  await async.eachLimit(livestreams, 2, async (livestream, cb) => {
    await Promise.all(languageList.map(async (language) => {
      const tt = await translate(language.toLowerCase(), livestream.title);

      title[language.toLowerCase()] = tt || livestream.title;
    }));

    const translatedItem = await repository.liveStreamTranslation.getByLivestream(livestream.id);

    if (translatedItem) {
      await repository.liveStreamTranslation.update(livestream.id, { title });
    } else {
      await repository.liveStreamTranslation.addNewLivestream({ livestream: livestream.id, title });
    }

    // eslint-disable-next-line no-unused-expressions
    cb && cb(null);
  });

  return true;
};
