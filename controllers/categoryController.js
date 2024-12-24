//categoryController.js
const categoryModel = require("../models/categoryModel");

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.fetchAll();
    res.status(200).json({ success: true, data: categories }); // Responding with JSON data
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    res.status(500).json({ success: false, error: "Error fetching categories." });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = await categoryModel.insertCategory(name);
    res.status(201).json({
      success: true,
      message: "Category added successfully.",
      data: newCategory, // Sending back the created category
    });
  } catch (err) {
    console.error("Error adding category:", err.message);
    res.status(500).json({ success: false, error: "Error adding category." });
  }
};

exports.addCategoryPage = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Rendered add category page." });
  } catch (err) {
    console.error("Error rendering add category page:", err.message);
    res.status(500).json({ success: false, error: "Error rendering add category page." });
  }
};

exports.editCategoryPage = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryModel.getCategoryById(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found." });
    }
    res.status(200).json({
      success: true,
      message: "Rendered edit category page.",
      data: category,
    });
  } catch (err) {
    console.error("Error fetching category:", err.message);
    res.status(500).json({ success: false, error: "Error fetching category." });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const updatedCategory = await categoryModel.updateCategory(req.params.id, name);
    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found." });
    }
    res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedCategory, // Sending back the updated category
    });
  } catch (err) {
    console.error("Error updating category:", err.message);
    res.status(500).json({ success: false, error: "Error updating category." });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await categoryModel.deleteCategory(id);
    if (!success) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found." });
    }
    res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting category:", err.message);
    res.status(500).json({ success: false, error: "Error deleting category." });
  }
};
