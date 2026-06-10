document.addEventListener('DOMContentLoaded', () => {
  // Check login state
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Bind DOM elements
  const checkoutForm = document.getElementById('checkout-form');
  const itemsListContainer = document.getElementById('checkout-items-list');
  const subtotalText = document.getElementById('checkout-subtotal');
  const taxText = document.getElementById('checkout-tax');
  const shippingText = document.getElementById('checkout-shipping');
  const discountRow = document.getElementById('checkout-coupon-row');
  const discountAmountText = document.getElementById('checkout-discount-amount');
  const totalText = document.getElementById('checkout-total');

  const payCodInput = document.getElementById('pay-cod');
  const payCardInput = document.getElementById('pay-card');
  const payCodLabel = document.getElementById('pay-cod-label');
  const payCardLabel = document.getElementById('pay-card-label');
  const cardPaymentForm = document.getElementById('card-payment-form');

  const cardNo = document.getElementById('card-number');
  const cardExp = document.getElementById('card-expiry');
  const cardCvc = document.getElementById('card-cvc');

  let activeCart = null;
  let hasDiscount = false;

  // 1. Fetch profile details to prefill address fields
  const prefillProfileAddress = async () => {
    try {
      const data = await API.get('/auth/profile');
      if (data.success && data.user) {
        const user = data.user;
        document.getElementById('ship-name').value = user.name || '';
        document.getElementById('ship-phone').value = user.phone || '';
        
        if (user.address) {
          document.getElementById('ship-street').value = user.address.street || '';
          document.getElementById('ship-city').value = user.address.city || '';
          document.getElementById('ship-state').value = user.address.state || '';
          document.getElementById('ship-zip').value = user.address.zipCode || '';
          document.getElementById('ship-country').value = user.address.country || '';
        }
      }
    } catch (err) {
      console.error('Failed to prefill user shipping details', err);
    }
  };

  // 2. Fetch and render checkout items list
  const fetchCheckoutCart = async () => {
    showLoader(true);
    try {
      const data = await API.get('/cart');
      if (data.success && data.cart) {
        activeCart = data.cart;
        
        if (!activeCart.products || activeCart.products.length === 0) {
          window.location.href = '/cart.html';
          return;
        }

        renderSummary(data.cart);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading checkout items', 'error');
    } finally {
      showLoader(false);
    }
  };

  const renderSummary = (cart) => {
    itemsListContainer.innerHTML = '';
    
    cart.products.forEach(item => {
      const product = item.productId;
      if (!product) return;

      const node = document.createElement('div');
      node.style.display = 'flex';
      node.style.justifyContent = 'space-between';
      node.style.alignItems = 'center';
      node.style.marginBottom = '1rem';
      
      const imageUrl = product.images && product.images[0]
        ? product.images[0]
        : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

      node.innerHTML = `
        <div style="display: flex; gap: 0.8rem; align-items: center;">
          <img src="${imageUrl}" alt="${product.title}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid var(--glass-border);">
          <div style="max-width: 180px;">
            <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.title}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Qty: ${item.quantity}</div>
          </div>
        </div>
        <strong style="font-size: 0.95rem;">₹${(product.price * item.quantity).toFixed(2)}</strong>
      `;
      itemsListContainer.appendChild(node);
    });

    calculateFinalInvoice();
  };

  const calculateFinalInvoice = () => {
    if (!activeCart) return;

    const subtotal = activeCart.totalPrice;
    const tax = Number((subtotal * 0.08).toFixed(2));
    const shipping = subtotal >= 100 ? 0 : 10;
    
    // Check coupon in storage
    const promo = localStorage.getItem('couponCode');
    let discount = 0;
    
    if (promo === 'SAVE20') {
      hasDiscount = true;
      discount = Number((subtotal * 0.20).toFixed(2));
      discountRow.style.display = 'flex';
      discountAmountText.textContent = `-₹${discount.toFixed(2)}`;
    } else {
      hasDiscount = false;
      discountRow.style.display = 'none';
    }

    const total = Number((subtotal + tax + shipping - discount).toFixed(2));

    subtotalText.textContent = `₹${subtotal.toFixed(2)}`;
    taxText.textContent = `₹${tax.toFixed(2)}`;
    shippingText.textContent = shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`;
    totalText.textContent = `₹${total.toFixed(2)}`;
  };

  // 3. Payment Option Toggles
  const handlePaymentToggle = () => {
    if (payCardInput.checked) {
      payCardLabel.classList.add('active');
      payCodLabel.classList.remove('active');
      cardPaymentForm.style.display = 'block';
      
      cardNo.setAttribute('required', 'true');
      cardExp.setAttribute('required', 'true');
      cardCvc.setAttribute('required', 'true');
    } else {
      payCodLabel.classList.add('active');
      payCardLabel.classList.remove('active');
      cardPaymentForm.style.display = 'none';

      cardNo.removeAttribute('required');
      cardExp.removeAttribute('required');
      cardCvc.removeAttribute('required');
    }
  };

  if (payCodInput) payCodInput.addEventListener('change', handlePaymentToggle);
  if (payCardInput) payCardInput.addEventListener('change', handlePaymentToggle);

  // 4. Form Submit placing the order
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const shippingAddress = {
        name: document.getElementById('ship-name').value.trim(),
        phone: document.getElementById('ship-phone').value.trim(),
        street: document.getElementById('ship-street').value.trim(),
        city: document.getElementById('ship-city').value.trim(),
        state: document.getElementById('ship-state').value.trim(),
        zipCode: document.getElementById('ship-zip').value.trim(),
        country: document.getElementById('ship-country').value.trim()
      };

      const paymentMethod = payCardInput.checked ? 'Card Payment' : 'Cash on Delivery';

      showLoader(true);
      try {
        const data = await API.post('/orders/create', {
          shippingAddress,
          paymentMethod
        });

        if (data.success && data.order) {
          // Clear checkout discount states
          localStorage.removeItem('couponCode');
          showToast('Order placed successfully!', 'success');
          
          setTimeout(() => {
            window.location.href = `/order-confirmation.html?id=${data.order._id}&code=${data.order.orderId}`;
          }, 1000);
        }
      } catch (err) {
        showToast(err.message || 'Error processing checkout', 'error');
      } finally {
        showLoader(false);
      }
    });
  }

  // Run initial loading
  prefillProfileAddress();
  fetchCheckoutCart();
});
