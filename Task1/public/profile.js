document.addEventListener('DOMContentLoaded', () => {
  // Verify token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Bind side navigation buttons
  const btnShowProfile = document.getElementById('btn-show-profile');
  const btnShowOrders = document.getElementById('btn-show-orders');
  const btnLogoutUser = document.getElementById('btn-logout-user');
  
  // Bind central panels
  const panelProfile = document.getElementById('panel-profile');
  const panelOrders = document.getElementById('panel-orders');
  const panelTracking = document.getElementById('panel-tracking');
  
  // Bind form fields
  const profileForm = document.getElementById('profile-update-form');
  
  // Tracking elements
  const btnBackToOrders = document.getElementById('btn-back-to-orders');

  // 1. Load active user profile details
  const loadProfileData = async () => {
    showLoader(true);
    try {
      const data = await API.get('/auth/profile');
      if (data.success && data.user) {
        const user = data.user;
        
        // Update sidebar
        document.getElementById('user-display-name').textContent = user.name;
        document.getElementById('user-display-role').textContent = user.role;

        // Populate fields
        document.getElementById('prof-name').value = user.name || '';
        document.getElementById('prof-email').value = user.email || '';
        document.getElementById('prof-phone').value = user.phone || '';

        if (user.address) {
          document.getElementById('prof-street').value = user.address.street || '';
          document.getElementById('prof-city').value = user.address.city || '';
          document.getElementById('prof-state').value = user.address.state || '';
          document.getElementById('prof-zip').value = user.address.zipCode || '';
          document.getElementById('prof-country').value = user.address.country || '';
        }
      }
    } catch (err) {
      showToast('Error retrieving user details', 'error');
    } finally {
      showLoader(false);
    }
  };

  // 2. Fetch order history list
  const loadOrderHistory = async () => {
    showLoader(true);
    try {
      const data = await API.get('/orders/user');
      if (data.success && data.orders) {
        renderOrdersList(data.orders);
      }
    } catch (err) {
      showToast('Failed to load order history', 'error');
    } finally {
      showLoader(false);
    }
  };

  const renderOrdersList = (orders) => {
    const listEmpty = document.getElementById('orders-list-empty');
    const tableWrapper = document.getElementById('orders-table-wrapper');
    const tbody = document.getElementById('orders-list-tbody');
    
    tbody.innerHTML = '';

    if (orders.length === 0) {
      listEmpty.style.display = 'block';
      tableWrapper.style.display = 'none';
      return;
    }

    listEmpty.style.display = 'none';
    tableWrapper.style.display = 'block';

    orders.forEach(order => {
      const oDate = new Date(order.orderDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      const statusClass = order.orderStatus.toLowerCase();
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${order.orderId}</strong></td>
        <td>${oDate}</td>
        <td>₹${order.totalAmount.toFixed(2)}</td>
        <td><span class="status-badge ${statusClass}">${order.orderStatus}</span></td>
        <td>
          <button class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="trackOrderDetails('${order._id}')">
            Track <i class="fa-solid fa-truck-fast"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  };

  // 3. Track Specific Order Details
  window.trackOrderDetails = async (mongoOrderId) => {
    showLoader(true);
    try {
      const data = await API.get(`/orders/${mongoOrderId}`);
      if (data.success && data.order) {
        const order = data.order;
        
        // Hide other panels, show tracking panel
        panelProfile.classList.add('hidden');
        panelOrders.classList.add('hidden');
        panelTracking.classList.remove('hidden');

        // Populate fields
        document.getElementById('tracking-num').textContent = order.orderId;
        document.getElementById('tracking-payment').textContent = order.paymentMethod;
        document.getElementById('tracking-total').textContent = `₹${order.totalAmount.toFixed(2)}`;
        
        // Dest address
        const addr = order.shippingAddress;
        document.getElementById('tracking-address').innerHTML = `
          <strong>${addr.name}</strong><br>
          Phone: ${addr.phone}<br>
          ${addr.street}, ${addr.city}, ${addr.state} - ${addr.zipCode}, ${addr.country}
        `;

        // Render products snapshot
        const itemsList = document.getElementById('tracking-items-list');
        itemsList.innerHTML = '';
        order.products.forEach(p => {
          const item = document.createElement('div');
          item.style.display = 'flex';
          item.style.justifyContent = 'space-between';
          item.style.alignItems = 'center';
          item.style.padding = '0.8rem 0';
          item.style.borderBottom = '1px solid var(--glass-border)';
          
          item.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center;">
              <img src="${p.image}" alt="${p.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
              <div>
                <strong style="font-size: 0.95rem;">${p.title}</strong>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Qty: ${p.quantity} @ ₹${p.price.toFixed(2)}</div>
              </div>
            </div>
            <strong>₹${(p.price * p.quantity).toFixed(2)}</strong>
          `;
          itemsList.appendChild(item);
        });

        // Stepper Progress Updater
        // Status: 'Pending', 'Processing', 'Shipped', 'Delivered'
        const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
        const currentIdx = steps.indexOf(order.orderStatus);

        steps.forEach((step, idx) => {
          const stepNode = document.getElementById(`step-${step.toLowerCase()}`);
          stepNode.classList.remove('active', 'completed');
          
          if (idx < currentIdx) {
            stepNode.classList.add('completed');
          } else if (idx === currentIdx) {
            stepNode.classList.add('active');
          }
        });
      }
    } catch (err) {
      showToast('Error loading tracking details', 'error');
    } finally {
      showLoader(false);
    }
  };

  // 4. Panel toggles & side nav indicators
  const switchPanel = (activeBtn, panelToShow) => {
    // Nav buttons status
    btnShowProfile.classList.remove('active');
    btnShowOrders.classList.remove('active');
    activeBtn.classList.add('active');

    // Panels display status
    panelProfile.classList.add('hidden');
    panelOrders.classList.add('hidden');
    panelTracking.classList.add('hidden');
    panelToShow.classList.remove('hidden');
  };

  btnShowProfile.addEventListener('click', () => {
    switchPanel(btnShowProfile, panelProfile);
  });

  btnShowOrders.addEventListener('click', () => {
    switchPanel(btnShowOrders, panelOrders);
    loadOrderHistory();
  });

  btnBackToOrders.addEventListener('click', () => {
    switchPanel(btnShowOrders, panelOrders);
    loadOrderHistory();
  });

  // 5. Update Profile Form Submission
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('prof-name').value.trim();
      const email = document.getElementById('prof-email').value.trim();
      const phone = document.getElementById('prof-phone').value.trim();
      const password = document.getElementById('prof-password').value;

      const address = {
        street: document.getElementById('prof-street').value.trim(),
        city: document.getElementById('prof-city').value.trim(),
        state: document.getElementById('prof-state').value.trim(),
        zipCode: document.getElementById('prof-zip').value.trim(),
        country: document.getElementById('prof-country').value.trim()
      };

      const payload = { name, email, phone, address };
      if (password) {
        payload.password = password;
      }

      showLoader(true);
      try {
        const data = await API.put('/auth/profile', payload);
        if (data.success) {
          showToast('Account profile updated successfully!', 'success');
          
          // Sync localStorage user details
          localStorage.setItem('user', JSON.stringify({
            _id: data._id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            address: data.address
          }));

          // Clear password field
          document.getElementById('prof-password').value = '';
          
          loadProfileData();
        }
      } catch (err) {
        showToast(err.message || 'Error updating details', 'error');
      } finally {
        showLoader(false);
      }
    });
  }

  // 6. Sign Out triggers
  if (btnLogoutUser) {
    btnLogoutUser.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showToast('Signed out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    });
  }

  // 7. Check for Deep Linking parameters (?track=mongo_order_id)
  const checkDeepLinking = () => {
    const trackId = urlParams.get('track');
    if (trackId) {
      switchPanel(btnShowOrders, panelTracking);
      trackOrderDetails(trackId);
    }
  };

  // Run initialization
  loadProfileData();
  checkDeepLinking();
});
