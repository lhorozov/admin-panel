const CancelLiveStreamRobot = require('./logics/CancelLiveStreamRobot');
const HideTestLiveStreamRobot = require('./logics/HideTestLiveStreamRobot');
const HideTestProductRobot = require('./logics/HideTestProductRobot');
const TranslateProductRobot = require('./logics/TranslateProductsRobot');
const UpdateProductCountRobot = require('./logics/UpdateProductCountRobot');
const UpdateStreamCountRobot = require('./logics/UpdateStreamCountRobot');
// const TranslateProductsRobot = require('./logics/TranslateProductsRobot');

const robots = [
  new CancelLiveStreamRobot(),
  new HideTestLiveStreamRobot(),
  new HideTestProductRobot(),
  // new TranslateProductRobot(),
  // new UpdateProductCountRobot(),
  // new UpdateStreamCountRobot(),
];
function startRobots() {
  robots.forEach((robot) => {
    robot.start();
  });
}

module.exports = {
  startRobots,
};
