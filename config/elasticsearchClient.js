const { Client } = require('@elastic/elasticsearch');

const elasticClient = new Client({
  node: 'http://localhost:9200', // Replace with your ElasticSearch URL
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || '', // Optional
    password: process.env.ELASTICSEARCH_PASSWORD || '', // Optional
  },
});

const INDEX_NAME = 'microservice_products'; // Define index name

const ensureIndexExists = async () => {
  try {
    const exists = await elasticClient.indices.exists({ index: INDEX_NAME });
    if (!exists.body) {
      await elasticClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              description: { type: 'text' },
              category: { type: 'keyword' },
              price: { type: 'float' },
              quantity: { type: 'integer' },
              image: { type: 'text' },
              seller: {
                properties: {
                  id: { type: 'keyword' },
                  profileUrl: { type: 'text' },
                },
              },
            },
          },
        },
      });
      console.log(`Index '${INDEX_NAME}' created.`);
    }
  } catch (error) {
    console.error('Error ensuring ElasticSearch index exists:', error.message);
  }
};

module.exports = { elasticClient, ensureIndexExists, INDEX_NAME };

