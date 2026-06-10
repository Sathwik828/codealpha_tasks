const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// Helper to recalculate total cart price based on actual product database prices
const recalculateCart = async (cart) => {
  let totalPrice = 0;
  for (const item of cart.products) {
    const product = await Product.findById(item.productId);
    if (product) {
      totalPrice += product.price * item.quantity;
    }
  }
  cart.totalPrice = Number(totalPrice.toFixed(2));
  return cart;
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: 'products.productId',
      select: 'title price stock images category'
    });

    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        products: [],
        totalPrice: 0
      });
    }

    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
});

// @desc    Add product to cart
// @route   POST /api/cart/add
// @access  Private
router.post('/add', protect, async (req, res, next) => {
  const { productId, quantity } = req.body;
  const qty = parseInt(quantity) || 1;

  try {
    // Check if product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        products: [],
        totalPrice: 0
      });
    }

    // Check if product is already in cart
    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      // Check stock limit
      const newQty = cart.products[itemIndex].quantity + qty;
      if (newQty > product.stock) {
        res.status(400);
        return next(new Error(`Only ${product.stock} items available in stock`));
      }
      cart.products[itemIndex].quantity = newQty;
    } else {
      // Check stock limit
      if (qty > product.stock) {
        res.status(400);
        return next(new Error(`Only ${product.stock} items available in stock`));
      }
      cart.products.push({ productId, quantity: qty });
    }

    cart = await recalculateCart(cart);
    await cart.save();

    // Populate product details before returning
    await cart.populate({
      path: 'products.productId',
      select: 'title price stock images category'
    });

    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
router.put('/update', protect, async (req, res, next) => {
  const { productId, quantity } = req.body;
  const qty = parseInt(quantity);

  if (qty < 1) {
    res.status(400);
    return next(new Error('Quantity must be at least 1'));
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    if (qty > product.stock) {
      res.status(400);
      return next(new Error(`Only ${product.stock} items available in stock`));
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      res.status(404);
      return next(new Error('Cart not found'));
    }

    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      cart.products[itemIndex].quantity = qty;
      cart = await recalculateCart(cart);
      await cart.save();

      await cart.populate({
        path: 'products.productId',
        select: 'title price stock images category'
      });

      res.json({ success: true, cart });
    } else {
      res.status(404);
      return next(new Error('Product not in cart'));
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Remove product from cart
// @route   DELETE /api/cart/remove
// @access  Private
router.delete('/remove', protect, async (req, res, next) => {
  const { productId } = req.body;

  try {
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      res.status(404);
      return next(new Error('Cart not found'));
    }

    cart.products = cart.products.filter(
      (item) => item.productId.toString() !== productId
    );

    cart = await recalculateCart(cart);
    await cart.save();

    await cart.populate({
      path: 'products.productId',
      select: 'title price stock images category'
    });

    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
