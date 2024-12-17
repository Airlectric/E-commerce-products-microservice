const { elasticClient, INDEX_NAME } = require('../config/elasticsearchClient');

const syncProductToElastic = async (product) => {
  try {
    await elasticClient.index({
      index: INDEX_NAME,
      id: product._id.toString(),
      body: {
        title: product.title,
        description: product.description,
        category: product.category || null,
        price: product.price,
        quantity: product.quantity,
        image: product.image || null,
        seller: product.seller || {},
      },
    });
    console.log(`Synced product to ElasticSearch: ${product.title}`);
  } catch (err) {
    console.error(`Failed to sync product to ElasticSearch: ${err.message}`);
  }
};

const deleteProductFromElastic = async (productId) => {
  try {
    const response = await elasticClient.delete({
      index: INDEX_NAME,
      id: productId.toString(),
    });

    // Handle Elasticsearch's "not_found" result explicitly
    if (response.result === "not_found") {
      console.warn(`Document with ID ${productId} not found in Elasticsearch index '${INDEX_NAME}'.`);
    } else {
      console.log(`Deleted product from Elasticsearch: ${productId}`);
    }
  } catch (err) {
    // Handle potential network or server errors
    console.error(`Failed to delete product from Elasticsearch: ${err.message}`);
  }
};


module.exports = { syncProductToElastic, deleteProductFromElastic };
