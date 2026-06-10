const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// Helper to generate a unique readable Order ID
const generateOrderId = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'ORD-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// @desc    Create a new order (checkout)
// @route   POST /api/orders/create
// @access  Private
router.post('/create', protect, async (req, res, next) => {
  const { shippingAddress, paymentMethod } = req.body;

  try {
    // 1. Fetch user's cart
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || cart.products.length === 0) {
      res.status(400);
      return next(new Error('Cart is empty'));
    }

    // 2. Validate product availability and prepare snapshot list
    const orderProducts = [];
    for (const item of cart.products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        res.status(404);
        return next(new Error(`Product with ID ${item.productId} not found`));
      }

      if (product.stock < item.quantity) {
        res.status(400);
        return next(new Error(`Insufficient stock for "${product.title}". Only ${product.stock} items remaining.`));
      }

      orderProducts.push({
        productId: product._id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'
      });
    }

    // 3. Deduct product inventory
    for (const item of cart.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // 4. Generate order details
    const orderId = generateOrderId();
    const order = new Order({
      orderId,
      userId: req.user._id,
      products: orderProducts,
      totalAmount: cart.totalPrice,
      shippingAddress,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      orderStatus: 'Pending'
    });

    const createdOrder = await order.save();

    // 5. Clear user's cart
    cart.products = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: createdOrder
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get logged in user's orders
// @route   GET /api/orders/user
// @access  Private
router.get('/user', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ orderDate: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Verify order owner or admin status
    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized to view this order'));
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
router.get('/', protect, admin, async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate('userId', 'name email')
      .sort({ orderDate: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res, next) => {
  const { status } = req.body;

  if (!['Pending', 'Processing', 'Shipped', 'Delivered'].includes(status)) {
    res.status(400);
    return next(new Error('Invalid order status'));
  }

  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderStatus = status;
      const updatedOrder = await order.save();
      res.json({ success: true, order: updatedOrder });
    } else {
      res.status(404);
      return next(new Error('Order not found'));
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
