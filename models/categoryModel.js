const Category = require("../schema/Category");

exports.fetchAll = async () => {
  return await Category.find();
};

exports.insertCategory = async (name) => {
  const newCategory = new Category({ name });
  return await newCategory.save();
};

exports.getCategoryById = async (id) => {
  return await Category.findById(id);
};

exports.updateCategory = async (id, name) => {
  return await Category.findByIdAndUpdate(id, { name }, { new: true });
};

exports.deleteCategory = async (id) => {
  const deleted = await Category.findByIdAndDelete(id);
  return !!deleted; // Returns true if deleted, false otherwise
};
