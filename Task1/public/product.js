document.addEventListener('DOMContentLoaded', () => {
  // 1. Get Product ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/shop.html';
    return;
  }

  let currentProduct = null;
  let selectedRating = 5;

  // 2. Load Product details from server
  const loadProductDetails = async () => {
    showLoader(true);
    try {
      const data = await API.get(`/products/${productId}`);
      if (data.success && data.product) {
        currentProduct = data.product;
        renderDetails(data.product);
        loadRelatedProducts(data.product.category, data.product._id);
      }
    } catch (err) {
      showToast(err.message || 'Error loading product details', 'error');
      document.getElementById('product-details-container').innerHTML = `
        <div style="grid-column: span 2; text-align: center; color: var(--danger); padding: 5rem 0;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>Product not found or database offline.</p>
        </div>
      `;
    } finally {
      showLoader(false);
    }
  };

  const renderDetails = (product) => {
    const container = document.getElementById('product-details-container');
    
    // Star rating generator
    let starsHtml = '';
    const fullStars = Math.floor(product.rating);
    const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fa-solid fa-star"></i>';
    if (halfStar) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
    for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="fa-regular fa-star"></i>';

    // Stock elements
    const isInStock = product.stock > 0;
    const stockClass = isInStock ? 'in-stock' : 'out-of-stock';
    const stockText = isInStock 
      ? `<i class="fa-solid fa-circle-check"></i> In Stock (${product.stock} items remaining)`
      : '<i class="fa-solid fa-circle-xmark"></i> Out of Stock';

    // Image galleries
    const images = product.images.length > 0 
      ? product.images 
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
    
    let thumbnailsHtml = '';
    images.forEach((img, idx) => {
      thumbnailsHtml += `
        <div class="thumbnail-item ${idx === 0 ? 'active' : ''}" onclick="switchMainImage(this, '${img}')">
          <img src="${img}" alt="Thumbnail ${idx + 1}">
        </div>
      `;
    });

    container.innerHTML = `
      <!-- Left Column: Gallery -->
      <div class="product-gallery">
        <div class="main-image-container">
          <img id="main-product-image" src="${images[0]}" alt="${product.title}">
        </div>
        <div class="thumbnail-row">
          ${thumbnailsHtml}
        </div>
      </div>

      <!-- Right Column: Product Info -->
      <div class="product-info-col">
        <span class="product-detail-category">${product.category}</span>
        <h1 class="product-detail-title">${product.title}</h1>
        
        <div class="product-detail-rating">
          <span class="stars">${starsHtml}</span>
          <span class="rating-value" style="font-size: 1rem;">${product.rating}</span>
          <span class="review-count">(${product.reviews.length} reviews)</span>
        </div>

        <div class="product-detail-price">₹${product.price.toFixed(2)}</div>
        <p class="product-detail-desc">${product.description}</p>

        <div class="stock-status ${stockClass}">
          ${stockText}
        </div>

        ${isInStock ? `
          <div class="product-actions">
            <div class="quantity-selector">
              <button class="qty-btn" id="btn-qty-minus"><i class="fa-solid fa-minus"></i></button>
              <input type="text" id="qty-input" class="qty-input" value="1" readonly>
              <button class="qty-btn" id="btn-qty-plus"><i class="fa-solid fa-plus"></i></button>
            </div>
            
            <button class="btn-primary" id="btn-add-to-cart" style="padding: 1rem 2rem;">
              Add to Cart <i class="fa-solid fa-cart-shopping"></i>
            </button>
            <button class="btn-secondary" id="btn-buy-now" style="background-color: var(--secondary); border-color: var(--secondary); color: white; padding: 1rem 2rem;">
              Buy Now
            </button>
          </div>
        ` : `
          <button class="btn-primary" style="opacity: 0.5; cursor: not-allowed; width: fit-content; margin-bottom: 2rem;" disabled>
            Sold Out <i class="fa-solid fa-ban"></i>
          </button>
        `}
      </div>
    `;

    // Bind quantity buttons dynamically
    if (isInStock) {
      const qtyInput = document.getElementById('qty-input');
      const btnMinus = document.getElementById('btn-qty-minus');
      const btnPlus = document.getElementById('btn-qty-plus');
      const btnAddToCart = document.getElementById('btn-add-to-cart');
      const btnBuyNow = document.getElementById('btn-buy-now');

      btnMinus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value);
        if (val > 1) qtyInput.value = val - 1;
      });

      btnPlus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value);
        if (val < product.stock) qtyInput.value = val + 1;
      });

      const addToCart = async (redirect = false) => {
        const token = localStorage.getItem('token');
        if (!token) {
          showToast('Please sign in to continue purchase', 'error');
          setTimeout(() => { window.location.href = '/login.html'; }, 1200);
          return;
        }

        const qty = parseInt(qtyInput.value);
        showLoader(true);
        try {
          const data = await API.post('/cart/add', { productId: product._id, quantity: qty });
          if (data.success) {
            updateNavbar();
            showToast('Added to shopping cart!', 'success');
            if (redirect) {
              setTimeout(() => { window.location.href = '/checkout.html'; }, 800);
            }
          }
        } catch (err) {
          showToast(err.message || 'Error adding to cart', 'error');
        } finally {
          showLoader(false);
        }
      };

      btnAddToCart.addEventListener('click', () => addToCart(false));
      btnBuyNow.addEventListener('click', () => addToCart(true));
    }

    // Populate Tab details
    document.getElementById('product-tab-description').textContent = product.description;
    document.getElementById('tab-reviews-count-btn').textContent = `Reviews (${product.reviews.length})`;

    renderReviews(product.reviews);
  };

  // Switch image handler
  window.switchMainImage = (el, src) => {
    document.getElementById('main-product-image').src = src;
    document.querySelectorAll('.thumbnail-item').forEach(thumb => {
      thumb.classList.remove('active');
    });
    el.classList.add('active');
  };

  // Render review listings and review submission box
  const renderReviews = (reviews) => {
    const listContainer = document.getElementById('reviews-list-container');
    listContainer.innerHTML = '';

    if (reviews.length === 0) {
      listContainer.innerHTML = '<p style="color: var(--text-secondary); margin-bottom: 2rem;">No reviews yet for this product. Be the first to share your thoughts!</p>';
    } else {
      reviews.forEach(r => {
        let reviewStars = '';
        for (let i = 1; i <= 5; i++) {
          reviewStars += i <= r.rating 
            ? '<i class="fa-solid fa-star" style="color: var(--warning);"></i>' 
            : '<i class="fa-regular fa-star" style="color: var(--warning);"></i>';
        }
        
        const rDate = new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

        const node = document.createElement('div');
        node.className = 'review-item glass';
        node.innerHTML = `
          <div class="review-item-header">
            <div>
              <div class="reviewer-name">${r.userName}</div>
              <div style="margin-top: 0.3rem;">${reviewStars}</div>
            </div>
            <div class="review-date">${rDate}</div>
          </div>
          <p>${r.comment}</p>
        `;
        listContainer.appendChild(node);
      });
    }

    // Review Form submission
    const formSection = document.getElementById('add-review-section');
    const token = localStorage.getItem('token');
    
    if (token) {
      formSection.innerHTML = `
        <div class="add-review-form glass">
          <h3>Share Your Review</h3>
          
          <div class="form-group">
            <label>Select Rating</label>
            <div class="rating-select" id="review-stars-selector">
              <i class="fa-solid fa-star selected" data-value="1"></i>
              <i class="fa-solid fa-star selected" data-value="2"></i>
              <i class="fa-solid fa-star selected" data-value="3"></i>
              <i class="fa-solid fa-star selected" data-value="4"></i>
              <i class="fa-solid fa-star selected" data-value="5"></i>
            </div>
          </div>

          <div class="form-group">
            <label for="review-comment">Review Description</label>
            <textarea id="review-comment" class="form-control" rows="4" placeholder="Write your review here..." required></textarea>
          </div>

          <button id="btn-submit-review" class="btn-primary">
            Submit Review <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      `;

      // Set up click events on star values
      const stars = document.querySelectorAll('#review-stars-selector i');
      stars.forEach(s => {
        s.addEventListener('click', (e) => {
          selectedRating = parseInt(e.currentTarget.getAttribute('data-value'));
          
          stars.forEach(star => {
            const val = parseInt(star.getAttribute('data-value'));
            if (val <= selectedRating) {
              star.classList.add('selected');
            } else {
              star.classList.remove('selected');
            }
          });
        });
      });

      // Handle submit button click
      const submitBtn = document.getElementById('btn-submit-review');
      submitBtn.addEventListener('click', async () => {
        const comment = document.getElementById('review-comment').value.trim();
        if (!comment) {
          showToast('Please write a comment description', 'error');
          return;
        }

        showLoader(true);
        try {
          const data = await API.post(`/products/${productId}/reviews`, {
            rating: selectedRating,
            comment
          });
          if (data.success) {
            showToast('Review submitted successfully!', 'success');
            // Reload page to reflect changes
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } catch (err) {
          showToast(err.message || 'Error submitting review', 'error');
        } finally {
          showLoader(false);
        }
      });

    } else {
      formSection.innerHTML = `
        <div class="glass" style="text-align: center; padding: 2rem; border-radius: var(--border-radius-md);">
          <p style="color: var(--text-secondary);"><i class="fa-solid fa-lock" style="margin-right: 0.5rem;"></i> You must be signed in to submit reviews.</p>
          <a href="/login.html" class="btn-secondary" style="margin-top: 1rem;">Sign In</a>
        </div>
      `;
    }
  };

  // Tab Header click handlers
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const targetTab = e.currentTarget;
      targetTab.classList.add('active');

      const panelId = targetTab.getAttribute('data-tab');
      document.getElementById(panelId).classList.add('active');
    });
  });

  // 3. Related Products loader
  const loadRelatedProducts = async (category, excludeId) => {
    try {
      const data = await API.get(`/products?category=${encodeURIComponent(category)}&limit=5`);
      if (data.success && data.products) {
        const container = document.getElementById('related-products-container');
        container.innerHTML = '';
        
        const filtered = data.products.filter(p => p._id !== excludeId).slice(0, 4);

        if (filtered.length === 0) {
          container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No related products found.</p>';
          return;
        }

        filtered.forEach(p => {
          container.appendChild(createProductCard(p));
        });
      }
    } catch (err) {
      console.error('Failed to load related products', err);
    }
  };

  // Run initialization
  loadProductDetails();
});
