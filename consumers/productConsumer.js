const amqp = require('amqplib');
const { elasticClient } = require('../config/elasticsearch');

const QUEUE_NAME = 'product_queue';

const connectConsumer = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`Listening for messages on queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());
        console.log('Received message:', message);

        try {
          switch (message.event) {
            case 'product_created':
              await indexProductInElasticsearch(message.payload);
              break;
            case 'product_updated':
              await updateProductInElasticsearch(message.payload);
              break;
            case 'product_deleted':
              await removeProductFromElasticsearch(message.payload.id);
              break;
            default:
              console.warn('Unknown event type:', message.event);
          }
        } catch (err) {
          console.error('Error processing message:', err.message);
        }

        channel.ack(msg); // Acknowledge that the message has been processed
      }
    });
  } catch (err) {
    console.error('Error connecting RabbitMQ consumer:', err);
  }
};

// Index product in Elasticsearch
const indexProductInElasticsearch = async (product) => {
  try {
    await elasticClient.index({
      index: 'products',
      id: product.id,
      body: product,
    });
    console.log('Product indexed successfully:', product.id);
  } catch (err) {
    console.error('Error indexing product:', err.message);
  }
};

// Update product in Elasticsearch
const updateProductInElasticsearch = async (product) => {
  try {
    await elasticClient.update({
      index: 'products',
      id: product.id,
      body: {
        doc: product,
      },
    });
    console.log('Product updated successfully:', product.id);
  } catch (err) {
    console.error('Error updating product:', err.message);
  }
};

// Remove product from Elasticsearch
const removeProductFromElasticsearch = async (productId) => {
  try {
    await elasticClient.delete({
      index: 'products',
      id: productId,
    });
    console.log('Product removed successfully:', productId);
  } catch (err) {
    console.error('Error removing product:', err.message);
  }
};

module.exports = { connectConsumer };
