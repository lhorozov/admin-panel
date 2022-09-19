/**
 * @name uploadProductCategoryCSV
 * @description uploads product categories using csv file.
 * 
 */
const path = require('path');
const uuid = require('uuid/v4');
const csv = require('csv-parser');
const { Validator } = require('node-input-validator');
const { ApolloError } = require('apollo-server');
const logger = require(path.resolve('config/logger'));

const { assets: { types: assetTypes } } = require(path.resolve('config'));
const MIMEAssetTypes = require(path.resolve('src/lib/MIMEAssetTypes'));
const { ErrorHandler } = require(path.resolve("src/lib/ErrorHandler"));
const errorHandler = new ErrorHandler();

const activity = {
  parseCSVContent: async (readStream) => {
    const results = [];
    return new Promise((resolve, reject) => {
      readStream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results);
        });
    })
  },
  processBatch: async (rows, repository) => {
    const result = {
      success: 0,
      failed: 0,
      failedList: {
        ids: [],
        errors: [],
      }
    }

    return Promise.all(rows.map(row => {
      return activity.processRow(row, repository)
        .then(category => {
          result.success ++;
        })
        .catch(error => {
          result.failed ++;
          result.failedList.errors.push(error.message);
          result.failedList.ids.push(row._id);
        })
    }))
    .then(() => result);
  },
  processRow: async (row, repository) => {
    return repository.productCategory.getById(row._id)
      .then(category => {
        const data = activity.composeCategoryData(row);
        if (category) {
          Object.keys(data).map(key => category[key] = data[key]);
          return category.save();
        } else {
          return repository.productCategory.create(data);
        }
      })
  },
  composeCategoryData: (row) => {
    const { _id, parent, parents, image, level, liveStreamCategory, name, createdAt, order } = row;
    const category = {
      _id,
      parent: parent ? parent : null,
      parents,
      hasChildren: row.hasChildren === 'TRUE' ? true : false,
      image,
      level,
      liveStreamCategory: liveStreamCategory ? liveStreamCategory : null,
      name,
      createdAt,
      order,
    };

    // if (row['parents.0']) category.parents.push(row['parents.0']);
    // if (row['parents.1']) category.parents.push(row['parents.1']);

    return category;
  },
  fixParentHierarchy: (row, rows) => {
    if (!row.parent) return [null];

    const [parent] = rows.filter(item => item._id === row.parent);
    if (!parent) return [null];
    else {
      return [...(activity.fixParentHierarchy(parent, rows)), row.parent];
    }
  },
};

module.exports = async (_, { file, batch }, { dataSources: { repository }, user }) => {
  const { createReadStream, mimetype, filename } = await file;
  const fileStream = createReadStream();
  const validator = new Validator({ mimetype }, {
    mimetype: "required",
  })

  validator.addPostRule(async (input) => {
    const detectedType = MIMEAssetTypes.detect(input.inputs.mimetype);
    if (!detectedType || detectedType.type !== assetTypes.CSV) {
      validator.addError('mimetype', 'custom', '"Mutation.uploadBulkBanners" accepts CSV file only!');
    }
  });

 
  const result = {
    total: 0,
    success: 0,
    failed: 0,
    failedList: {
      ids: [],
      errors: [],
    }
  };

  return validator.check()
    .then(matched => {
      if (!matched) throw errorHandler.build(validator.errors);
      return activity.parseCSVContent(fileStream);
    })
    .then(async (csvRows) => {
      csvRows.map(row => row.parents = activity.fixParentHierarchy(row, csvRows));

      result.total = csvRows.length;

      const batches = Math.ceil(csvRows.length / batch);

      for (let i = 0; i < batches; i ++) {
        await activity.processBatch(csvRows.slice(i * batch, (i + 1) * batch), repository)
          .then(batchResult => {
            logger.info(`[UploadProductCategory][Batch] ${i * batch} - ${(i + 1) * batch} [Done]`);
            result.success += batchResult.success;
            result.failed += batchResult.failed;
            result.failedList.ids = result.failedList.ids.concat(batchResult.failedList.ids);
            result.failedList.errors = result.failedList.errors.concat(batchResult.failedList.errors);
          })
      }

    })
    .then(() => result)
    .catch(error => {
      logger.info(`[UploadProductCategory][Error] ${error.message}`);
      result.failedList.errors.push(error.message);
      return result;
    })
}
