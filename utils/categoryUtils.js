// product microservice utils/categoryUtils.js
const Category = require('../schema/Category');  

const resolveCategoryName = async (categoryId) => {
  const category = await Category.findById(categoryId).select('name');
  return category ? category.name : null; 
};

module.exports = { resolveCategoryName };
