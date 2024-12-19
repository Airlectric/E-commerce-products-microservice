// Product microservice productController.js
const Product = require("../models/productModel");
const Category = require("../schema/Category");
const { sendMessage } = require("../config/rabbitmq");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const { syncProductToElastic, deleteProductFromElastic } = require('../services/elasticsearchSync');

const conn = mongoose.connection;
let gfsBucket;
conn.once("open", () => {
  gfsBucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
});

const uploadToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
    });
    uploadStream.end(file.buffer);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
  });
};

// Helper: Resolve category name by ID
const resolveCategoryName = async (categoryId) => {
  const category = await Category.findById(categoryId).select("name");
  return category ? category.name : null;
};

// Create a product
exports.createProduct = async (req, res) => {
  try {
	  
    const { title, description, category_id, price, quantity, imageUrl, profileUrl } = req.body;

    const categoryName = await resolveCategoryName(category_id);
    if (!categoryName) {
      return res.status(404).json({ message: "Category not found" });
    }

    const product = {
      title,
      description,
      category_id,
      price,
      quantity,
      seller: { id: req.user.user_id, profileUrl },
    };
	

    if (imageUrl) {
      product.image = imageUrl;
    } else if (req.file) {
      const imageId = await uploadToGridFS(req.file);
      product.imageId = imageId;
    }

    const newProduct = new Product(product);
    const savedProduct = await newProduct.save();
	
	// Sync with ElasticSearch
	await syncProductToElastic({
	  ...savedProduct._doc,
	  category: categoryName,
	});


    sendMessage("product_events", {
      type: "product_created",
      data: { ...savedProduct._doc, category: categoryName },
    });
	
	sendMessage("product_events_for_notifications", {
      type: "product_created",
      data: { ...savedProduct._doc, category: categoryName },
    });

    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category_id", "name");
    const mappedProducts = products.map((product) => ({
      ...product._doc,
      category: product.category_id.name,
    }));
    res.json(mappedProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category_id", "name");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ ...product._doc, category: product.category_id.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const { title, description, category_id, price, quantity, imageUrl, profileUrl } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (String(product.seller.id) !== String(req.user.user_id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    let categoryName = null; // Resolve the category only if it changes
    if (category_id && String(category_id) !== String(product.category_id)) {
      const category = await Category.findById(category_id).select("name");
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      categoryName = category.name;
      product.category_id = category_id;
    } else {
      const existingCategory = await resolveCategoryName(product.category_id);
      categoryName = existingCategory || null;
    }

    product.title = title || product.title;
    product.description = description || product.description;
    product.price = price || product.price;
    product.quantity = quantity || product.quantity;
    product.seller.profileUrl = profileUrl || product.seller.profileUrl;

    if (imageUrl) {
      product.image = imageUrl;
      product.imageId = undefined;
    } else if (req.file) {
      const imageId = await uploadToGridFS(req.file);
      product.imageId = imageId;
      product.image = undefined;
    }

    const updatedProduct = await product.save();
	
	// Sync with ElasticSearch
	await syncProductToElastic({
	  ...updatedProduct._doc,
	  category: categoryName,
	});


    sendMessage("product_events", {
      type: "product_updated",
      data: { ...updatedProduct._doc, category: categoryName },
    });
	
	sendMessage("product_events_for_notifications", {
      type: "product_updated",
      data: { ...updatedProduct._doc, category: categoryName },
    });

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (String(product.seller.id) !== String(req.user.user_id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (product.imageId) {
      await gfsBucket.delete(product.imageId);
    }

    if (product.seller.profileImageId) {
      await gfsBucket.delete(product.seller.profileImageId);
    }

    // Fetch category name before deleting
    const categoryName = await resolveCategoryName(product.category_id);

    // Delete the product using `deleteOne`
    await Product.deleteOne({ _id: product._id });
	
	// Delete from ElasticSearch
	await deleteProductFromElastic(product._id);	

    // Send RabbitMQ messages
    sendMessage("product_events", {
      type: "product_deleted",
      data: { ...product.toObject(), category: categoryName },
    });

    sendMessage("product_events_for_notifications", {
      type: "product_deleted",
      data: { ...product.toObject(), category: categoryName },
    });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error in deleteProduct:", err.message);
    res.status(500).json({ message: err.message });
  }
};
