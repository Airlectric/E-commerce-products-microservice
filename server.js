require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const { createIndex } = require('./config/elasticsearch');
const { connectConsumer } = require('./consumers/productConsumer');
const { consumeInventoryUpdate } = require("./events/consumeInventoryUpdate")

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/products', productRoutes);
app.use('/category', categoryRoutes);

connectDB();
connectRabbitMQ();
consumeInventoryUpdate();

// Ensure the Elasticsearch index is created
createIndex();

// Start RabbitMQ consumer
connectConsumer();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
