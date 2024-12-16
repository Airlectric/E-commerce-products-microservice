const express = require("express");
const categoryController = require("../controllers/categoryController");
const router = express.Router();

router.get("/", categoryController.getAllCategories);
router.post("/", categoryController.addCategory);
router.get("/add", categoryController.addCategoryPage);
router.get("/:id/edit", categoryController.editCategoryPage);
router.post("/:id", categoryController.updateCategory);
router.post("/:id/delete", categoryController.deleteCategory);

module.exports = router;
