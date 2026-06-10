document.addEventListener('DOMContentLoaded', () => {
  const cartItemsList = document.getElementById('cart-items-list');
  const cartPageContent = document.getElementById('cart-page-content');
  const cartEmptyView = document.getElementById('cart-empty-view');
  
  const subtotalText = document.getElementById('summary-subtotal');
  const taxText = document.getElementById('summary-tax');
  const shippingText = document.getElementById('summary-shipping');
  const totalText = document.getElementById('summary-total');
  
  const couponRow = document.getElementById('coupon-row');
  const couponDiscountAmountText = document.getElementById('coupon-discount-amount');
  const couponInput = document.getElementById('coupon-input');
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  const checkoutBtn = document.getElementById('checkout-btn');

  let activeCart = null;
  let appliedCoupon = false;

  // 1. Fetch Cart from server
  const fetchCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showEmptyCartView();
      return;
    }

    showLoader(true);
    try {
      const data = await API.get('/cart');
      if (data.success && data.cart) {
        activeCart = data.cart;
        renderCart(data.cart);
      }
    } catch (err) {
      console.error(err);
      showToast('Error retrieving cart items', 'error');
    } finally {
      showLoader(false);
    }
  };

  const showEmptyCartView = () => {
    if (cartPageContent) cartPageContent.style.display = 'none';
    if (cartEmptyView) cartEmptyView.style.display = 'block';
  };

  const renderCart = (cart) => {
    if (!cart.products || cart.products.length === 0) {
      showEmptyCartView();
      return;
    }

    if (cartPageContent) cartPageContent.style.display = 'grid';
    if (cartEmptyView) cartEmptyView.style.display = 'none';

    cartItemsList.innerHTML = '';

    cart.products.forEach(item => {
      // Validate populated references
      const product = item.productId;
      if (!product) return;

      const node = document.createElement('div');
      node.className = 'cart-item glass';
      
      const imageUrl = product.images && product.images[0]
        ? product.images[0]
        : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

      node.innerHTML = `
        <div class="cart-item-image">
          <img src="${imageUrl}" alt="${product.title}">
        </div>
        <div class="cart-item-info">
          <span class="cart-item-category">${product.category}</span>
          <h3 class="cart-item-title"><a href="/product.html?id=${product._id}">${product.title}</a></h3>
          <div class="cart-item-price">₹${product.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-actions">
          <button class="cart-item-remove" title="Remove Item" onclick="removeCartItem('${product._id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          
          <div class="quantity-selector" style="height: 34px;">
            <button class="qty-btn" style="width:34px; height:34px;" onclick="updateCartItemQty('${product._id}', ${item.quantity - 1})">
              <i class="fa-solid fa-minus" style="font-size: 0.8rem;"></i>
            </button>
            <input type="text" class="qty-input" style="width:34px; font-size: 0.9rem;" value="${item.quantity}" readonly>
            <button class="qty-btn" style="width:34px; height:34px;" onclick="updateCartItemQty('${product._id}', ${item.quantity + 1}, ${product.stock})">
              <i class="fa-solid fa-plus" style="font-size: 0.8rem;"></i>
            </button>
          </div>
        </div>
      `;
      cartItemsList.appendChild(node);
    });

    calculateTotals();
  };

  // 2. Calculations
  const calculateTotals = () => {
    if (!activeCart) return;

    const subtotal = activeCart.totalPrice;
    const tax = Number((subtotal * 0.08).toFixed(2));
    
    // Shipping: free above $100, else $10
    const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 10;
    
    let discount = 0;
    if (appliedCoupon) {
      discount = Number((subtotal * 0.20).toFixed(2));
      couponRow.style.display = 'flex';
      couponDiscountAmountText.textContent = `-₹${discount.toFixed(2)}`;
      localStorage.setItem('couponCode', 'SAVE20');
    } else {
      couponRow.style.display = 'none';
      localStorage.removeItem('couponCode');
    }

    const total = Number((subtotal + tax + shipping - discount).toFixed(2));

    subtotalText.textContent = `₹${subtotal.toFixed(2)}`;
    taxText.textContent = `₹${tax.toFixed(2)}`;
    shippingText.textContent = shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`;
    totalText.textContent = `₹${total.toFixed(2)}`;
  };

  // 3. Actions
  window.updateCartItemQty = async (productId, nextQty, maxStock = 9999) => {
    if (nextQty < 1) {
      removeCartItem(productId);
      return;
    }

    if (nextQty > maxStock) {
      showToast(`Only ${maxStock} items available in stock`, 'error');
      return;
    }

    showLoader(true);
    try {
      const data = await API.put('/cart/update', { productId, quantity: nextQty });
      if (data.success && data.cart) {
        activeCart = data.cart;
        renderCart(data.cart);
        updateNavbar();
      }
    } catch (err) {
      showToast(err.message || 'Error updating quantity', 'error');
    } finally {
      showLoader(false);
    }
  };

  window.removeCartItem = async (productId) => {
    showLoader(true);
    try {
      const data = await API.request('/cart/remove', 'DELETE', { productId });
      if (data.success && data.cart) {
        activeCart = data.cart;
        renderCart(data.cart);
        updateNavbar();
        showToast('Item removed from cart', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Error removing item', 'error');
    } finally {
      showLoader(false);
    }
  };

  // 4. Coupons handler
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', () => {
      const code = couponInput.value.trim().toUpperCase();
      if (code === 'SAVE20') {
        appliedCoupon = true;
        calculateTotals();
        showToast('Coupon "SAVE20" applied! (20% Off)', 'success');
      } else if (code === '') {
        appliedCoupon = false;
        calculateTotals();
      } else {
        showToast('Invalid Coupon Code!', 'error');
      }
    });
  }

  // 5. Checkout click
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (activeCart && activeCart.products.length > 0) {
        window.location.href = '/checkout.html';
      }
    });
  }

  // Run initialization
  fetchCart();
});
