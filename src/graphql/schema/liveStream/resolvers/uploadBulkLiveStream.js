/* eslint-disable no-return-await */
/* eslint-disable no-restricted-syntax */
const path = require("path");
const uuid = require("uuid/v4");
const promise = require("bluebird");
const { Validator } = require("node-input-validator");
const { slugify } = require("transliteration");
const { UserInputError } = require("apollo-server");

const XLSX = require("xlsx");

const lodash = require("lodash");

const repository = require(path.resolve("src/repository"));

const AWS = require("aws-sdk");
const { get } = require("request");

const { aws, shopName } = require(path.resolve("config"));

const s3 = new AWS.S3();
const logger = require(path.resolve("config/logger"));

let liveStreams;
let failedParsing;
let failedItems;
const {
  StreamChannelStatus,
  StreamChannelType,
  StreamRecordStatus,
  SourceType,
} = require(path.resolve("src/lib/Enums"));

const getDataFromCsv = async (params) => {
  const csv = await new Promise((resolve, reject) => {
    s3.getObject(params, async (err, data) => {
      if (err) {
        reject(err);
      }

      const dataRes = await data.Body.toString("UTF-8");
      resolve(dataRes);
    });
  });
  return csv;
};

const getDataFromXlsx = async (params) => {
  const csv = await new Promise((resolve, reject) => {
    s3.getObject(params, async (err, data) => {
      if (err) {
        reject(err);
      }

      const workbook = XLSX.read(data.Body, { type: "buffer" });
      var sheet_name_list = workbook.SheetNames;
      let dataItem = {};
      sheet_name_list.forEach(function (y) {
        var worksheet = workbook.Sheets[y];
        var headers = {};
        var data = [];
        for (z in worksheet) {
          if (z[0] === "!") continue;
          //parse out the column, row, and value
          var tt = 0;
          for (var i = 0; i < z.length; i++) {
            if (!isNaN(z[i])) {
              tt = i;
              break;
            }
          }
          var col = z.substring(0, tt);
          var row = parseInt(z.substring(tt));
          var value = worksheet[z].v;

          //store header names
          if (row == 1 && value) {
            headers[col] = value;
            continue;
          }

          if (!data[row]) data[row] = {};
          data[row][headers[col]] = value;
        }
        //drop those first two rows which are empty
        data.shift();
        data.shift();
        dataItem[y] = data;
      });

      resolve(dataItem);
    });
  });

  return csv;
};

async function getlivestreamsource(user, datasource, repository) {
  return new Promise((resolve) => {
    repository.streamSource
      .create({
        source: datasource,
        type: SourceType.VIDEO_AUDIO,
        user,
        prerecorded: true,
      })
      .then((streamsource) => {
        resolve(streamsource);
      });
  });
}
async function generateSlug({ title }, repository) {
  let slug = slugify(title);
  const streamBySlug = await repository.liveStream.getOne({ slug });
  if (streamBySlug) {
    const rand = Math.floor(Math.random() * 1000);
    slug += `-${rand.toString().padStart(3, "0")}`;
    const streamBySlug2 = await repository.liveStream.getOne({ slug });
    if (streamBySlug2) return generateSlug({ title }, repository);
  }
  return slug;
}
const addLiveStream = async (liveStream, index) => {
  // console.log("addLiveStream", liveStream)
  const { _id } = liveStream;
  if (!_id) {
    liveStream._id = uuid();
  }
  if (_id === "") liveStream._id = uuid();

  const user = await new Promise((resolve) =>
    repository.user
      .findById(liveStream.streamer)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        failedParsing.push(
          `While reading the csv could not find seller ${index}`
        );
        resolve(null);
      })
  );

  const validator = new Validator(liveStream, {
    title: "required",
  });

  return (
    validator
      .check()
      .then(async (matched) => {
        if (!matched) {
          throw errorHandler.build(validator.errors);
        }
      })
      .then(async () => {
        const experience = await repository.liveStreamExperience.getByName(
          liveStream.experience
        );
        if (!experience) {
          pushfailedItems({
            id: "experience",
            errors: [
              `Live Stream Experience "${liveStream.experience}" does not exist`,
              `csvPosition: ${index + 1}`,
            ],
          });

          throw new UserInputError(
            `Live Stream Experience ${liveStream.experience} does not exist`,
            { invalidArgs: "experience" }
          );
        }
        liveStream.experience = experience.id;

        liveStream.categories.map(async (category, idx) => {
          const categoryObject = await repository.liveStreamCategory.getByName(
            category
          );
          if (!categoryObject) {
            pushfailedItems({
              id: "category",
              errors: [
                `Live Stream Category ${category} does not exist`,
                `csvPosition: ${index + 1}`,
              ],
            });

            throw new UserInputError(
              `Live Stream Category ${category} does not exist`,
              { invalidArgs: "categories" }
            );
          }
          liveStream.categories[idx] = categoryObject.id;
        });
      })
      // .then(() =>
      //   Promise.all(
      //     liveStream.preview.map((assetId) => repository.asset.load(assetId))
      //   ).then((previews) => {
      //     if (previews && previews.length > 0) {
      //       previews
      //         .filter((item) => !item)
      //         .forEach((preview, i) => {
      //           throw new Error(
      //             `Preview can not be addded to the Live Stream, because of Asset "${liveStream.preview[i]}" does not exist!`
      //           );
      //         });
      //     }
      //   })
      // )
      .then(() =>
        Promise.all([repository.asset.getByName(liveStream.previewVideo)]).then(
          ([previewVideo]) => {
            if (liveStream.previewVideo && !previewVideo) {
              pushfailedItems({
                id: "asset_error",
                errors: [
                  `Asset ${liveStream.previewVideo} does not exist`,
                  `csvPosition: ${index + 1}`,
                ],
              });
              throw new UserInputError(
                `Asset ${liveStream.previewVideo} does not exist`,
                { invalidArgs: "preview" }
              );
            }
            liveStream.previewVideo = previewVideo.id;
          }
        )
      )
      .then(() =>
        Promise.all(
          liveStream.productDurations.map(async (productDuration, idx) => {
            let p_temp = await repository.product.getByTitle(
              productDuration.product
            );
            if (!p_temp) {
              pushfailedItems({
                id: "product",
                errors: [
                  `Live Stream can not be added, because of Product "${liveStream.productDurations[idx].product}" does not exist!`,
                  `csvPosition: ${index + 1}`,
                ],
              });

              throw new Error(
                `Live Stream can not be added, because of Product "${liveStream.productDurations[idx].product}" does not exist!`
              );
            }
            liveStream.productDurations[idx].product = p_temp.id;
            return p_temp;
          })
        )
      )
      .then(() =>
        repository.asset.getByName(liveStream.thumbnail).then((thumbnail) => {
          if (!thumbnail) {
            pushfailedItems({
              id: "thumbnail",
              errors: [
                `Thumbnail asset does not exist with id "${liveStream.thumbnail}"!`,
                `csvPosition: ${index + 1}`,
              ],
            });

            throw new Error(
              `Thumbnail asset does not exist with id "${liveStream.thumbnail}"!`
            );
          }
          liveStream.thumbnail = thumbnail._id;
        })
      )

      .then(async () => {
        const channelId = uuid();
        const liveStreamId = uuid();
        const agoraToken = "";
        let sources = [];

        liveStream.liveStreamRecord = liveStream.liveStreamRecord || [];
        if (liveStream.liveStreamRecord.length > 0) {
          await Promise.all(
            liveStream.liveStreamRecord.map(async (recordItem) => {
              sources.push(
                await getlivestreamsource(user, recordItem, repository)
              );
            })
          );
        } else {
          sources.push(
            await getlivestreamsource(
              user,
              "https://recording.shoclef.com/" + channelId + "-record.mp4",
              repository
            )
          );
        }

        finisheddate = new Date();
        starteddate = new Date(finisheddate - 10 * 60 * 1000);
        const channel = {
          _id: channelId,
          type: StreamChannelType.BROADCASTING,
          finishedAt:
            liveStream.liveStreamRecord.length > 0 ? finisheddate : null,
          startedAt:
            liveStream.liveStreamRecord.length > 0 ? starteddate : null,
          status:
            liveStream.liveStreamRecord.length > 0
              ? StreamChannelStatus.FINISHED
              : StreamChannelStatus.PENDING,
          record: {
            enabled: true,
            status:
              liveStream.liveStreamRecord.length > 0
                ? StreamRecordStatus.FINISHED
                : StreamRecordStatus.PENDING,
            sources: sources,
          },
        };

        const messageThread = {
          tags: [`LiveStream:${liveStreamId}`],
          participants: [user],
        };

        const participant = {
          channel: channelId,
          token: agoraToken,
          user,
          isPublisher: true,
        };

        return Promise.all([
          liveStreamId,
          repository.streamChannel.create(channel),
          repository.messageThread.create(messageThread),
          repository.streamChannelParticipant.create(participant),
        ]);
      })
      .then(async ([_id, streamChannel, messageThread]) => {
        repository.userHasMessageThread
          .create({
            thread: messageThread.id,
            user: user.id,
            readBy: Date.now(),
            muted: false,
            hidden: false,
          })
          .catch((error) => {
            logger.error(
              `Failed to update User Thread on join public thread for user "${user.id}". Original error: ${error}`
            );
          });
        console.log("channel =>", streamChannel);

        // resize thumbnail
        const thumbnail = await repository.asset.getById(liveStream.thumbnail);

        // if (
        //   thumbnail &&
        //   (!thumbnail.resolution ||
        //     (thumbnail.resolution.width && thumbnail.resolution.width > 500))
        // ) {
        //   await AssetService.resizeImage({
        //     assetId: liveStream.thumbnail,
        //     width: 500,
        //   });
        // }
        if (failedItems.length > 0) return null;
        return repository.liveStream.create({
          _id,
          streamer: liveStream.streamer,
          title: liveStream.title,
          status:
            liveStream.liveStreamRecord.length > 0
              ? StreamChannelStatus.FINISHED
              : StreamChannelStatus.PENDING,
          experience: liveStream.experience,
          categories: liveStream.categories,
          city: liveStream.city,
          preview: liveStream.preview,
          previewVideo: liveStream.previewVideo || null,
          channel: streamChannel,
          publicMessageThread: messageThread,
          length: 0,
          realViews: 0,
          realLikes: 0,
          fakeViews: 0,
          fakeLikes: 0,
          startTime: liveStream.startTime
            ? new Date(liveStream.startTime)
            : new Date(),
          productDurations: liveStream.productDurations,
          orientation: liveStream.orientation,
          thumbnail: liveStream.thumbnail,
          isFeatured: liveStream.isFeatured,
          hashtags: liveStream.hashtags || [],
          slug: await generateSlug({ title: liveStream.title }, repository),
        });
      })
      .catch((err) => {
        console.log("addLiveStream error", err);
        const error = errorFormater(err, index + 1);
        pushfailedItems({
          id: "addLiveStream",
          errors: [error, `csvPosition: ${index + 1}`],
        });
      })
  );
};

const errorFormater = (err, row) => {
  let parsedError = [];
  if (err.errmsg) {
    parsedError = err.errmsg;
  } else {
    parsedError = "unknown error";
  }
  parsedError += ` on row ${row}`;

  return parsedError;
};

const pushfailedItems = async (item) => {
  failedItems.push(item);
};

const pushLiveStreams = async (liveStream) => {
  liveStreams.push(liveStream);
};

const csvGetRecord = (text) => {
  let p = "";
  let row = [""];
  const ret = [row];
  let i = 0;
  let r = 0;
  let s = !0;
  let l;
  for (l of text) {
    if (l === '"') {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (l === "," && s) l = row[++i] = "";
    else if (l === "\n" && s) {
      if (p === "\r") row[i] = row[i].slice(0, -1);
      row = ret[++r] = [(l = "")];
      i = 0;
    } else row[i] += l;
    p = l;
  }
  return ret;
};

const loopLiveStreamRows = async (csv) => {
  const csvRows = csvGetRecord(csv);
  // console.log({csvRows})
  const [header, ...rows] = csvRows;

  let index = 0;
  for (const row of rows) {
    if (row.length <= 1) {
      continue;
    }

    index++;
    const liveStream = {};
    let csvLiveStream = {};
    const products = [];
    await row.forEach((column, colIndex) => {
      if (header[colIndex].includes("product_name")) {
        products.push({ product: column.trim() });
      } else {
        csvLiveStream[header[colIndex].trim()] = column.trim();
      }
    });
    csvLiveStream.productDurations = products;
    // console.log({csvLiveStream}, csvLiveStream.user_uid)
    if (csvLiveStream.user_uid === undefined) {
      throw "It need to include user_uid";
    }
    if (csvLiveStream.stream_category === undefined) {
      throw "It need to include stream_category";
    }
    if (csvLiveStream.stream_title === undefined) {
      throw "It need to include stream_title";
    }
    if (csvLiveStream.city_location === undefined) {
      throw "It need to include city_location";
    }
    if (csvLiveStream.experience === undefined) {
      throw "It need to include experience";
    }
    if (csvLiveStream.scheduled_live_date_time === undefined) {
      throw "It need to include scheduled_live_date_time";
    }
    if (csvLiveStream.livesteram_video_asset === undefined) {
      throw "It need to include livesteram_video_asset";
    }

    // const email = liveStream.email ? liveStream.email.toLowerCase() : 'null';
    liveStream.streamer = await new Promise((resolve) =>
      repository.user
        .findById(csvLiveStream.user_uid)
        .then((res) => {
          resolve(res._id || res);
        })
        .catch((err) => {
          failedParsing.push(
            `While reading the csv could not find seller ${index} : ${csvLiveStream.user_uid}`
          );
          resolve(null);
        })
    );

    liveStream.categories = csvLiveStream.stream_category.includes(";")
      ? csvLiveStream.stream_category.split(";")
      : [csvLiveStream.stream_category];
    liveStream.experience = csvLiveStream.experience;
    liveStream.thumbnail = csvLiveStream.stream_cover_photo;
    liveStream.previewVideo = csvLiveStream.livesteram_video_asset;
    liveStream.title = csvLiveStream.stream_title;
    liveStream.startTime = csvLiveStream.scheduled_live_date_time;
    liveStream.city = csvLiveStream.city_location;
    liveStream.productDurations = csvLiveStream.productDurations;

    // liveStream.liveStreamRecord = JSON.parse('[' + liveStream.liveStreamRecord + ']');
    // liveStream.preview = JSON.parse('[' + liveStream.preview + ']');
    // liveStream.hashtags = JSON.parse('[' + liveStream.hashtags + ']');
    // liveStream.productDurations = liveStream.productDurations !== "" ? JSON.parse(liveStream.productDurations) : [];
    // console.log("csv liveStream", liveStream)
    await pushLiveStreams(liveStream);
  }
};

module.exports = async (_, { fileName, bucket }) => {
  liveStreams = [];
  failedParsing = [];
  failedItems = [];
  failedLiveStreams = [];
  assetsS3bucket = bucket;

  const params = {
    Bucket: bucket,
    Key: fileName,
  };

  const csv = await getDataFromCsv(params)
    .then((res) => res)
    .catch((err) => err);

  await loopLiveStreamRows(csv);

  if (failedParsing.length > 0) {
    throw failedParsing;
  }
  // console.log("liveStreams",liveStreams)
  return promise
    .map(
      liveStreams,
      async (liveStream, index) => await addLiveStream(liveStream, index)
    )
    .then((res) => {
      console.log("added item", res, failedItems, failedParsing);
      // res.filter((item) => item)

      return {
        success: res,
        errors: failedItems,
        total: liveStreams.length,
        upload: res.length,
      };
    })
    .catch((err) => {
      return {
        success: [],
        errors: { row: [...failed], errors: err },
        total: -1,
        failed: -1,
      };
    });
};
