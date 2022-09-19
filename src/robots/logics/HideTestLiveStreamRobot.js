/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
const path = require('path');
const NodeCache = require('node-cache');

const BaseRobot = require('./BaseRobot');

const logger = require(path.resolve('config/logger'));
const { robots } = require(path.resolve('config'));
const { StreamChannelStatus } = require(path.resolve('src/lib/Enums'));
const LiveStreamModel = require(path.resolve('src/model/LiveStreamModel'));
const cache = new NodeCache();

const HIDE_KEYWORD = 'TEST';

const activity = {
  shouldWork: () => {
    const time = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' });
    const hh = Number(time.split(':')[0]);
    const mm = Number(time.split(':')[1]);
    return (hh % 3 === 0) && (mm >= 0 || mm < 10);
  },
};

module.exports = class HideTestLiveStreamRobot extends BaseRobot {
  constructor() {
    super(10 * 60 * 1000);
  }

  execute() {
    if (!activity.shouldWork()) return false;
    return LiveStreamModel.find({
      title: { $regex: `^${HIDE_KEYWORD}`, $options: 'i' },
      status: { $nin: [StreamChannelStatus.CANCELED] },
    })
      .then((liveStreams) => Promise.all(liveStreams.map((stream) => {
        stream.status = StreamChannelStatus.CANCELED;
        return stream.save();
      })))
      .then(() => {
        logger.info('[HideTestLiveStreamRobot] Logic was executed');
        // super.execute();
      });
  }
};
