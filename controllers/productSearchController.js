const { elasticClient, INDEX_NAME } = require('./config/elasticsearchClient');

exports.searchProducts = async (req, res) => {
  const { query, category } = req.query;

  try {
    const searchParams = {
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [
              query ? { match: { title: query } } : {},
              category ? { term: { category: category.toLowerCase() } } : {},
            ],
          },
        },
      },
    };

    const result = await elasticClient.search(searchParams);

    const products = result.body.hits.hits.map((hit) => hit._source);

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
