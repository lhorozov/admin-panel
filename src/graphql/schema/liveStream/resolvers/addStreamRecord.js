const path = require('path');
const { Validator } = require('node-input-validator');

const {
  SourceType
} = require(path.resolve('src/lib/Enums'));
const { ErrorHandler } = require(path.resolve('src/lib/ErrorHandler'));
const errorHandler = new ErrorHandler();

module.exports = async (obj, args, { dataSources: { repository }, user }) => {
  const validator = new Validator(args, {
    liveStream: 'required',
    streamRecord: 'required',
  });

  let foundLiveStream;

  validator.addPostRule(provider => repository.liveStream.load(args.liveStream)
    .then(liveStream => {
      if (!liveStream) provider.error("id", "custom", `Live stream with id "${provider.inputs.id}" does not exist!`);
      foundLiveStream = liveStream;
    })
  );

  return validator.check()
    .then((matched) => {
      if (!matched) throw errorHandler.build(validator.errors);
      return repository.streamChannel.load(foundLiveStream.channel);
    })
    .then(async (streamChannel) => {
      if (!streamChannel) throw new Error('Stream channel does not exist!');
      // create stream record
      const streamRecord = await repository.streamSource.create({
        source: args.streamRecord,
        type: SourceType.VIDEO_AUDIO,
        user,
        prerecorded:true
      });

      streamChannel.record.sources.push(streamRecord._id);
      return streamChannel.save();
    })
    .then(streamChannel => foundLiveStream);
}