const Product = require('../models/productModel');
const { connectRabbitMQ, sendMessage } = require('../config/rabbitmq');
const { resolveCategoryName } = require('../utils/categoryUtils');

const consumeInventoryUpdate = async () => {
  const { channel } = await connectRabbitMQ();

  channel.consume('update_inventory', async (msg) => {
    const inventoryUpdates = JSON.parse(msg.content.toString());

    try {
      for (const update of inventoryUpdates) {
        const product = await Product.findById(update.productId);
        if (!product) {
          console.error(`Product with ID ${update.productId} not found`);
          continue;
        }

        // Update stock
        const newQuantity = product.quantity + update.quantity;
        if (newQuantity < 0) {
          console.error(`Insufficient stock for product ${product.title}`);
          continue;
        }

        product.quantity = newQuantity;

        // Resolve category if necessary
        const categoryName = product.category_id ? await resolveCategoryName(product.category_id) : null;

        // Save updated product and notify other services
        await product.save();
        console.log(`Updated stock for product ${product.title}: ${product.quantity}`);

        await sendMessage('product_events', {
          type: 'product_updated',
          data: {
            id: product.id,
            title: product.title,
            description: product.description,
            category: categoryName,
            price: product.price,
            quantity: product.quantity,
            image: product.image,
            seller: product.seller,
          },
        });
      }

      channel.ack(msg);
    } catch (err) {
      console.error('Failed to process inventory update:', err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log('Listening for inventory updates...');
};

module.exports = { consumeInventoryUpdate };
