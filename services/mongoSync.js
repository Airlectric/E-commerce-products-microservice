const Product = require('../models/productModel');
const { syncProductToElastic, deleteProductFromElastic } = require('../services/elasticsearchSync');

const syncWithMongo = () => {
  const changeStream = Product.watch();

  changeStream.on('change', async (change) => {
    try {
      switch (change.operationType) {
        case 'insert':
        case 'update': {
          const product = await Product.findById(change.documentKey._id).populate('category_id', 'name');
          await syncProductToElastic({
            ...product._doc,
            category: product.category_id?.name || null,
          });
          break;
        }
        case 'delete': {
          await deleteProductFromElastic(change.documentKey._id);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error('Error in syncWithMongo:', err.message);
    }
  });

  console.log('Listening for MongoDB changes...');
};

module.exports = { syncWithMongo };
