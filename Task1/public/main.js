// Theme Toggle Functionality
const initTheme = () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggleBtn.innerHTML = isDark 
      ? '<i class="fa-solid fa-sun"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
    
    // Animate rotation on click
    themeToggleBtn.querySelector('i').style.transform = 'rotate(360deg)';
    setTimeout(() => {
      themeToggleBtn.querySelector('i').style.transform = '';
    }, 500);
  });
};

// Toast Notifications Helper
const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast glass ${type}`;
  
  let iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  if (type === 'info') iconClass = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 4 seconds (matches fadeOut keyframes in css)
  setTimeout(() => {
    toast.remove();
  }, 4000);
};

// Loader Overlay Helper
const showLoader = (show) => {
  const loader = document.getElementById('loading-spinner');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
};

// Navbar Account Updates & Cart badge synchronizer
const updateNavbar = async () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  const loginBtn = document.getElementById('login-nav-btn');
  const profileBtn = document.getElementById('profile-nav-btn');
  const adminBtn = document.getElementById('admin-nav-btn');
  const cartBadge = document.getElementById('cart-badge-count');

  if (token && userStr) {
    const user = JSON.parse(userStr);
    
    if (loginBtn) loginBtn.classList.add('hidden');
    if (profileBtn) profileBtn.classList.remove('hidden');
    
    if (user.role === 'admin') {
      if (adminBtn) adminBtn.classList.remove('hidden');
    } else {
      if (adminBtn) adminBtn.classList.add('hidden');
    }

    // Fetch Cart count from server
    try {
      const data = await API.get('/cart');
      if (data.success && data.cart) {
        const totalItems = data.cart.products.reduce((acc, item) => acc + item.quantity, 0);
        if (cartBadge) {
          cartBadge.textContent = totalItems;
          cartBadge.style.display = totalItems > 0 ? 'block' : 'none';
        }
      }
    } catch (err) {
      console.error('Failed to sync navbar cart count', err);
    }
  } else {
    // Guest User
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileBtn) profileBtn.classList.add('hidden');
    if (adminBtn) adminBtn.classList.add('hidden');
    if (cartBadge) {
      cartBadge.textContent = '0';
      cartBadge.style.display = 'none';
    }
  }
};

// Global Helper to create Product Card Node
const createProductCard = (product) => {
  const card = document.createElement('div');
  card.className = 'product-card glass';
  
  // Rating stars generator
  let starsHtml = '';
  const fullStars = Math.floor(product.rating);
  const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
  for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fa-solid fa-star"></i>';
  if (halfStar) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
  for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="fa-regular fa-star"></i>';

  const imageUrl = product.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

  card.innerHTML = `
    <div class="product-card-image">
      <img src="${imageUrl}" alt="${product.title}" loading="lazy">
      <span class="product-card-badge">${product.category}</span>
      <button class="wishlist-btn" title="Add to Wishlist" onclick="toggleWishlist(event, '${product._id}')">
        <i class="fa-solid fa-heart"></i>
      </button>
    </div>
    <div class="product-card-info">
      <span class="product-card-category">${product.category}</span>
      <h3 class="product-card-title"><a href="/product.html?id=${product._id}">${product.title}</a></h3>
      <div class="product-card-rating">
        <span class="stars">${starsHtml}</span>
        <span class="rating-value">${product.rating}</span>
      </div>
      <div class="product-card-bottom">
        <span class="product-card-price">₹${product.price.toFixed(2)}</span>
        <button class="add-to-cart-btn" title="Add to Cart" onclick="handleAddToCartClick(event, '${product._id}')">
          <i class="fa-solid fa-cart-plus"></i>
        </button>
      </div>
    </div>
  `;

  // Restore wishlist state
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  if (wishlist.includes(product._id)) {
    card.querySelector('.wishlist-btn').classList.add('active');
  }

  return card;
};

// Wishlist trigger helper
const toggleWishlist = (e, productId) => {
  e.stopPropagation();
  e.preventDefault();
  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  
  const btn = e.currentTarget;
  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter(id => id !== productId);
    btn.classList.remove('active');
    showToast('Removed from wishlist', 'info');
  } else {
    wishlist.push(productId);
    btn.classList.add('active');
    showToast('Added to wishlist', 'success');
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
};

// Global Add to Cart handler
const handleAddToCartClick = async (e, productId) => {
  e.stopPropagation();
  e.preventDefault();
  
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please sign in to add items to cart', 'error');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    return;
  }

  showLoader(true);
  try {
    const data = await API.post('/cart/add', { productId, quantity: 1 });
    if (data.success) {
      showToast('Product added to cart!', 'success');
      updateNavbar();
    }
  } catch (err) {
    showToast(err.message || 'Failed to add item to cart', 'error');
  } finally {
    showLoader(false);
  }
};

// Search Suggestion System
const initSearchSuggestions = () => {
  const searchInput = document.getElementById('global-search');
  const suggestionsBox = document.getElementById('search-suggestions-box');
  
  if (!searchInput || !suggestionsBox) return;

  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
      suggestionsBox.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const data = await API.get(`/products?search=${encodeURIComponent(query)}&limit=5`);
        if (data.success && data.products.length > 0) {
          suggestionsBox.innerHTML = '';
          data.products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
              <img src="${p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'}" alt="${p.title}">
              <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${p.title}</div>
                <div style="font-size: 0.8rem; color: var(--primary); font-weight: 700;">₹${p.price.toFixed(2)}</div>
              </div>
            `;
            item.addEventListener('click', () => {
              window.location.href = `/product.html?id=${p._id}`;
            });
            suggestionsBox.appendChild(item);
          });
          suggestionsBox.style.display = 'block';
        } else {
          suggestionsBox.style.display = 'none';
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.style.display = 'none';
    }
  });

  // Handle enter key on search input
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `/shop.html?search=${encodeURIComponent(query)}`;
      }
    }
  });
};

// Document Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateNavbar();
  initSearchSuggestions();
});
