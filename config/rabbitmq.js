const amqp = require('amqplib');

let channel, connection;

const connectRabbitMQ = async () => {
  try {
    if (!connection) {
      connection = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();
    }
    console.log('RabbitMQ connected');

    // Ensure queues exist
    await channel.assertQueue('update_inventory', { durable: true });
    await channel.assertQueue('product_events_for_notifications', { durable: true }); 
	await channel.assertQueue('product_events', { durable: true }); 

    return { channel, connection };
  } catch (err) {
    console.error('Failed to connect to RabbitMQ:', err.message);
    throw err;
  }
};

// Modified sendMessage to support sending to multiple queues
const sendMessage = (queue, message) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    // Send message to the main queue
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
	
  } catch (err) {
    console.error(`Failed to send message to ${queue}:`, err.message);
  }
};

module.exports = { connectRabbitMQ, sendMessage };
