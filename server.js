require('dotenv').config();
const express = require('express');

// Import services and configurations
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { syncWithMongo } = require('./services/mongoSync');
const { ensureIndexExists } = require('./config/elasticsearchClient');
const { connectConsumer } = require('./consumers/productConsumer');
const { consumeInventoryUpdate } = require("./events/consumeInventoryUpdate");
const { initializeAndSyncCategories, searchCategories } = require('./elasticsearchCategorySync');

// Import Routes
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const imageRouter = require('./routes/imageRoutes');

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Setup Routes
app.use('/products', productRoutes);
app.use('/category', categoryRoutes);
app.use('/images', imageRouter);


// Initialize services and middlewares
const startServices = async () => {
  try {
    await connectDB();
    console.log('Database connected successfully.');

    // Connect to RabbitMQ and consume inventory updates
    await connectRabbitMQ();
    consumeInventoryUpdate();
    console.log('RabbitMQ connected and inventory updates consumer started.');

    // Synchronize MongoDB with Elasticsearch for categories
    await initializeAndSyncCategories();
    console.log('Elasticsearch sync initialized for categories.');

    // Ensure Elasticsearch indices exist
    await ensureIndexExists();
    console.log('Elasticsearch index checked/created.');

    // MongoDB Sync (you can remove this if it's already handled elsewhere)
    syncWithMongo();
    console.log('MongoDB synchronized with Elasticsearch.');

    // Start RabbitMQ Consumer for Products
    connectConsumer();
    console.log('RabbitMQ consumer started for product updates.');
  } catch (error) {
    console.error('Error during service initialization:', error.message);
    process.exit(1);
  }
};

// Search Categories Endpoint
app.get('/categories/search', async (req, res) => {
  const { name } = req.query; // Accept 'name' as a search query parameter

  try {
    const categories = await searchCategories({ name });
    res.json(categories);
  } catch (err) {
    console.error('Error searching categories:', err.message);
    res.status(500).json({ error: 'Failed to search categories' });
  }
});

// Start the server and services asynchronously
const startServer = async () => {
  await startServices();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

// Start the application
startServer();
