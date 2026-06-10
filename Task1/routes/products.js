const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// @desc    Get all products with filtering, search, sorting, pagination
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    // Build query object
    const queryObj = {};

    // 1. Search Query
    if (req.query.search) {
      queryObj.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // 2. Category Filter
    if (req.query.category && req.query.category !== 'All') {
      queryObj.category = req.query.category;
    }

    // 3. Price Filter
    if (req.query.minPrice || req.query.maxPrice) {
      queryObj.price = {};
      if (req.query.minPrice) {
        queryObj.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        queryObj.price.$lte = Number(req.query.maxPrice);
      }
    }

    // 4. Stock filter (optional)
    if (req.query.inStock === 'true') {
      queryObj.stock = { $gt: 0 };
    }

    // Sorting options
    let sortBy = { createdAt: -1 }; // Default: Newest first
    if (req.query.sort) {
      if (req.query.sort === 'priceAsc') {
        sortBy = { price: 1 };
      } else if (req.query.sort === 'priceDesc') {
        sortBy = { price: -1 };
      } else if (req.query.sort === 'ratingDesc') {
        sortBy = { rating: -1 };
      } else if (req.query.sort === 'oldest') {
        sortBy = { createdAt: 1 };
      }
    }

    const total = await Product.countDocuments(queryObj);
    const products = await Product.find(queryObj)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    // Get unique categories for filter display
    const categories = await Product.distinct('category');

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      categories,
      products
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      res.json({ success: true, product });
    } else {
      res.status(404);
      return next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Create a product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, async (req, res, next) => {
  const { title, description, category, price, stock, images } = req.body;

  try {
    const product = new Product({
      title,
      description,
      category,
      price,
      stock,
      images: images || ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
      rating: 0,
      reviews: []
    });

    const createdProduct = await product.save();
    res.status(201).json({ success: true, product: createdProduct });
  } catch (error) {
    next(error);
  }
});

// @desc    Update a product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res, next) => {
  const { title, description, category, price, stock, images } = req.body;

  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.title = title || product.title;
      product.description = description || product.description;
      product.category = category || product.category;
      product.price = price !== undefined ? price : product.price;
      product.stock = stock !== undefined ? stock : product.stock;
      product.images = images || product.images;

      const updatedProduct = await product.save();
      res.json({ success: true, product: updatedProduct });
    } else {
      res.status(404);
      return next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.deleteOne({ _id: req.params.id });
      res.json({ success: true, message: 'Product removed' });
    } else {
      res.status(404);
      return next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Create a new product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, async (req, res, next) => {
  const { rating, comment } = req.body;

  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // Check if user already reviewed this product
      const alreadyReviewed = product.reviews.find(
        (r) => r.userId.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        res.status(400);
        return next(new Error('Product already reviewed'));
      }

      const review = {
        userId: req.user._id,
        userName: req.user.name,
        rating: Number(rating),
        comment,
      };

      product.reviews.push(review);
      product.calculateAverageRating();

      await product.save();
      res.status(201).json({ success: true, message: 'Review added', product });
    } else {
      res.status(404);
      return next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
