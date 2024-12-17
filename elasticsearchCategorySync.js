// categoryService/elasticsearchSync.js
const mongoose = require('mongoose');
const { Client } = require('@elastic/elasticsearch');
const Category = require('./schema/Category');

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URI,
});

const INDEX_NAME = process.env.ELASTICSEARCH_CATEGORY_INDEX || 'microservice_categories';

// Initialize Elasticsearch index with settings and mappings
const initializeCategoryIndex = async () => {
  const exists = await esClient.indices.exists({ index: INDEX_NAME });

  if (!exists) {
    await esClient.indices.create({
      index: INDEX_NAME,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
        mappings: {
          properties: {
            name: { type: 'text' },
          },
        },
      },
    });
    console.log(`Index "${INDEX_NAME}" created for categories`);
  }
};

// Sync MongoDB changes to Elasticsearch in real-time
const startCategoryChangeStream = async () => {
  const connection = mongoose.connection;

  connection.once('open', () => {
    console.log('MongoDB connected for category change streams.');

    const changeStream = connection.collection('categories').watch();

    changeStream.on('change', async (change) => {
      try {
        const { operationType, documentKey, fullDocument } = change;

        if (operationType === 'insert' || operationType === 'update') {
          await esClient.index({
            index: INDEX_NAME,
            id: documentKey._id,
            body: {
              name: fullDocument.name,
            },
          });
          console.log(`Category ${documentKey._id} indexed/updated in Elasticsearch.`);
        } else if (operationType === 'delete') {
          await esClient.delete({
            index: INDEX_NAME,
            id: documentKey._id,
          });
          console.log(`Category ${documentKey._id} deleted from Elasticsearch.`);
        }
      } catch (error) {
        console.error('Error syncing category change to Elasticsearch:', error);
      }
    });

    console.log('Change stream listening for category updates.');
  });
};

// Search categories in Elasticsearch
const searchCategories = async (query) => {
  try {
    const { body } = await esClient.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [
              query.name ? { match: { name: query.name } } : { match_all: {} },
            ],
          },
        },
      },
    });

    return body.hits.hits.map((hit) => hit._source);
  } catch (error) {
    console.error('Error searching categories in Elasticsearch:', error);
    throw error;
  }
};

// Initialize the index and set up real-time sync
const initializeAndSyncCategories = async () => {
  await initializeCategoryIndex();
  await startCategoryChangeStream();
};

module.exports = {
  initializeAndSyncCategories,
  searchCategories,
};
