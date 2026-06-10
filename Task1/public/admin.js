document.addEventListener('DOMContentLoaded', () => {
  // Validate Admin Role
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    window.location.href = '/login.html';
    return;
  }

  const user = JSON.parse(userStr);
  if (user.role !== 'admin') {
    window.location.href = '/profile.html';
    return;
  }

  // Bind sidebar nav links
  const btnShowOverview = document.getElementById('btn-show-overview');
  const btnShowManageProducts = document.getElementById('btn-show-manage-products');
  const btnShowManageOrders = document.getElementById('btn-show-manage-orders');

  // Bind dashboard panels
  const panelOverview = document.getElementById('panel-overview');
  const panelManageProducts = document.getElementById('panel-manage-products');
  const panelManageOrders = document.getElementById('panel-manage-orders');

  // Bind Modals & Forms
  const productModal = document.getElementById('product-modal');
  const btnCreateProductModal = document.getElementById('btn-create-product-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const productCrudForm = document.getElementById('product-crud-form');
  const modalTitle = document.getElementById('modal-title');

  // 1. Dashboard Overview Analytics
  const loadOverviewAnalytics = async () => {
    showLoader(true);
    try {
      // Fetch concurrent counts
      const [ordersData, productsData, usersData] = await Promise.all([
        API.get('/orders'),
        API.get('/products?limit=999'),
        API.get('/auth/users')
      ]);

      if (ordersData.success && productsData.success && usersData.success) {
        const orders = ordersData.orders;
        const productsCount = productsData.total;
        const usersCount = usersData.users.length;

        // Calculate Revenue Sales
        const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);

        // Update Stats DOM
        document.getElementById('sales-stat-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
        document.getElementById('sales-stat-orders').textContent = orders.length;
        document.getElementById('sales-stat-products').textContent = productsCount;
        document.getElementById('sales-stat-users').textContent = usersCount;

        // Populate Recent Orders Preview (limit 5)
        const recentOrdersTbody = document.getElementById('overview-recent-orders');
        recentOrdersTbody.innerHTML = '';
        
        const previewOrders = orders.slice(0, 5);
        if (previewOrders.length === 0) {
          recentOrdersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No orders placed yet.</td></tr>';
        } else {
          previewOrders.forEach(o => {
            const customerName = o.userId ? o.userId.name : 'Guest Customer';
            const statusClass = o.orderStatus.toLowerCase();
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${o.orderId}</strong></td>
              <td>${customerName}</td>
              <td>₹${o.totalAmount.toFixed(2)}</td>
              <td><span class="status-badge ${statusClass}">${o.orderStatus}</span></td>
            `;
            recentOrdersTbody.appendChild(tr);
          });
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error retrieving sales statistics', 'error');
    } finally {
      showLoader(false);
    }
  };

  // 2. Manage Products Panel (CRUD list)
  const loadAdminProducts = async () => {
    showLoader(true);
    try {
      const data = await API.get('/products?limit=100'); // Load large batch for admin list
      if (data.success && data.products) {
        renderAdminProductsList(data.products);
      }
    } catch (err) {
      showToast('Failed to load products list', 'error');
    } finally {
      showLoader(false);
    }
  };

  const renderAdminProductsList = (products) => {
    const tbody = document.getElementById('admin-products-tbody');
    tbody.innerHTML = '';

    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Inventory is empty. Add a product!</td></tr>';
      return;
    }

    products.forEach(p => {
      const img = p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${img}" alt="${p.title}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
        <td><strong>${p.title}</strong></td>
        <td>${p.category}</td>
        <td>₹${p.price.toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-secondary" style="padding: 0.4rem 0.6rem;" onclick="openEditProductModal('${p._id}')" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-danger" style="padding: 0.4rem 0.6rem;" onclick="deleteProductItem('${p._id}')" title="Delete Product">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  // 3. Manage Orders Panel (Fulfillment list)
  const loadAdminOrders = async () => {
    showLoader(true);
    try {
      const data = await API.get('/orders');
      if (data.success && data.orders) {
        renderAdminOrdersList(data.orders);
      }
    } catch (err) {
      showToast('Failed to load orders lists', 'error');
    } finally {
      showLoader(false);
    }
  };

  const renderAdminOrdersList = (orders) => {
    const tbody = document.getElementById('admin-orders-tbody');
    tbody.innerHTML = '';

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No purchases logged yet.</td></tr>';
      return;
    }

    orders.forEach(o => {
      const customerName = o.userId ? o.userId.name : 'Deleted Account';
      const oDate = new Date(o.orderDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      const statusClass = o.orderStatus.toLowerCase();

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${o.orderId}</strong></td>
        <td>${customerName}</td>
        <td>${oDate}</td>
        <td>₹${o.totalAmount.toFixed(2)}</td>
        <td><span class="status-badge ${statusClass}" id="admin-badge-${o._id}">${o.orderStatus}</span></td>
        <td>
          <select class="form-control" style="padding: 0.3rem 0.5rem; width: auto; font-size: 0.85rem;" onchange="updateFulfillmentStatus('${o._id}', this)">
            <option value="Pending" ${o.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Processing" ${o.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipped" ${o.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  // 4. Update Order Status
  window.updateFulfillmentStatus = async (orderId, selectEl) => {
    const newStatus = selectEl.value;
    showLoader(true);
    try {
      const data = await API.put(`/orders/${orderId}/status`, { status: newStatus });
      if (data.success && data.order) {
        showToast(`Order status updated to ${newStatus}`, 'success');
        
        // Update badge class & text locally
        const badge = document.getElementById(`admin-badge-${orderId}`);
        if (badge) {
          badge.textContent = newStatus;
          badge.className = `status-badge ${newStatus.toLowerCase()}`;
        }
      }
    } catch (err) {
      showToast(err.message || 'Error updating order status', 'error');
    } finally {
      showLoader(false);
    }
  };

  // 5. Product Create / Edit Modal logic
  window.openEditProductModal = async (productId) => {
    showLoader(true);
    try {
      const data = await API.get(`/products/${productId}`);
      if (data.success && data.product) {
        const p = data.product;
        
        // Fill form fields
        document.getElementById('crud-product-id').value = p._id;
        document.getElementById('crud-title').value = p.title;
        document.getElementById('crud-category').value = p.category;
        document.getElementById('crud-price').value = p.price;
        document.getElementById('crud-stock').value = p.stock;
        document.getElementById('crud-image').value = p.images[0] || '';
        document.getElementById('crud-desc').value = p.description;

        modalTitle.textContent = 'Edit Product Catalog';
        productModal.style.display = 'flex';
      }
    } catch (err) {
      showToast('Error retrieving product details', 'error');
    } finally {
      showLoader(false);
    }
  };

  if (btnCreateProductModal) {
    btnCreateProductModal.addEventListener('click', () => {
      productCrudForm.reset();
      document.getElementById('crud-product-id').value = '';
      modalTitle.textContent = 'Add New Product Catalog';
      productModal.style.display = 'flex';
    });
  }

  const hideModal = () => {
    productModal.style.display = 'none';
  };

  if (btnCloseModal) btnCloseModal.addEventListener('click', hideModal);
  
  // Close modal clicking outside container
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) {
      hideModal();
    }
  });

  // Handle Product CRUD submit form
  if (productCrudForm) {
    productCrudForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const productId = document.getElementById('crud-product-id').value;
      const title = document.getElementById('crud-title').value.trim();
      const category = document.getElementById('crud-category').value;
      const price = Number(document.getElementById('crud-price').value);
      const stock = Number(document.getElementById('crud-stock').value);
      const imageUrl = document.getElementById('crud-image').value.trim();
      const description = document.getElementById('crud-desc').value.trim();

      const payload = {
        title,
        category,
        price,
        stock,
        images: imageUrl ? [imageUrl] : [],
        description
      };

      showLoader(true);
      try {
        let response;
        if (productId) {
          // Update
          response = await API.put(`/products/${productId}`, payload);
        } else {
          // Create
          response = await API.post('/products', payload);
        }

        if (response.success) {
          showToast(productId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
          hideModal();
          loadAdminProducts();
        }
      } catch (err) {
        showToast(err.message || 'Error saving product details', 'error');
      } finally {
        showLoader(false);
      }
    });
  }

  // Delete product action
  window.deleteProductItem = async (productId) => {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;

    showLoader(true);
    try {
      const data = await API.delete(`/products/${productId}`);
      if (data.success) {
        showToast('Product removed from database', 'info');
        loadAdminProducts();
      }
    } catch (err) {
      showToast(err.message || 'Error deleting product', 'error');
    } finally {
      showLoader(false);
    }
  };

  // 6. Navigation panel click states
  const switchAdminPanel = (activeBtn, panelToShow, dataFetcher) => {
    btnShowOverview.classList.remove('active');
    btnShowManageProducts.classList.remove('active');
    btnShowManageOrders.classList.remove('active');
    activeBtn.classList.add('active');

    panelOverview.classList.add('hidden');
    panelManageProducts.classList.add('hidden');
    panelManageOrders.classList.add('hidden');
    panelToShow.classList.remove('hidden');

    if (dataFetcher) dataFetcher();
  };

  btnShowOverview.addEventListener('click', () => {
    switchAdminPanel(btnShowOverview, panelOverview, loadOverviewAnalytics);
  });

  btnShowManageProducts.addEventListener('click', () => {
    switchAdminPanel(btnShowManageProducts, panelManageProducts, loadAdminProducts);
  });

  btnShowManageOrders.addEventListener('click', () => {
    switchAdminPanel(btnShowManageOrders, panelManageOrders, loadAdminOrders);
  });

  // Run initialization
  loadOverviewAnalytics();
});
