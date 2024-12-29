const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URI,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY 
  }
});


// Test Elasticsearch connection
(async () => {
  try {
    const ping = await elasticClient.ping();
    console.log('Elasticsearch is reachable:', ping);

    const health = await elasticClient.cluster.health();
    console.log('Elasticsearch Cluster Status:', health.status); // Updated
  } catch (error) {
    console.error('Elasticsearch connection error:', error.message);
  }
})();

/**
 * Create an index in Elasticsearch
 */
const createIndex = async (indexName = 'products') => {
  try {
    const exists = await elasticClient.indices.exists({ index: indexName });

    if (!exists.body) {
      await elasticClient.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              description: { type: 'text' },
              price: { type: 'double' },
              image: { type: 'text' },
              seller: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`Index '${indexName}' created successfully.`);
    } else {
      console.log(`Index '${indexName}' already exists. Skipping creation.`);
    }
  } catch (error) {
    console.error(`Error creating index '${indexName}':`, error.message);
  }
};

module.exports = { elasticClient, createIndex };
