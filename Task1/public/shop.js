document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State Definition
  let filters = {
    page: 1,
    limit: 6,
    category: 'All',
    search: '',
    minPrice: 0,
    maxPrice: 1200,
    sort: 'newest'
  };

  // 2. DOM Elements Bindings
  const productsGrid = document.getElementById('shop-products-grid');
  const paginationContainer = document.getElementById('shop-pagination');
  const resultsCountText = document.getElementById('results-count-text');
  const sidebarSearch = document.getElementById('sidebar-search');
  const categoryFilterBtns = document.querySelectorAll('.category-filter-btn');
  const minPriceInput = document.getElementById('min-price-input');
  const maxPriceInput = document.getElementById('max-price-input');
  const priceSlider = document.getElementById('price-range-slider');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const sortSelect = document.getElementById('sort-select');

  // 3. Initialize Filters from URL params (e.g. from hero specs or navigation links)
  const parseUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('category')) {
      filters.category = urlParams.get('category');
    }
    if (urlParams.has('search')) {
      filters.search = urlParams.get('search');
    }
    
    // Sync into DOM inputs
    if (sidebarSearch && filters.search) {
      sidebarSearch.value = filters.search;
    }
    
    if (categoryFilterBtns) {
      categoryFilterBtns.forEach(btn => {
        if (btn.getAttribute('data-category') === filters.category) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  };

  // 4. Load & Render Products
  const fetchProducts = async () => {
    showLoader(true);
    
    // Construct query parameters
    let query = `/products?page=${filters.page}&limit=${filters.limit}`;
    if (filters.category && filters.category !== 'All') {
      query += `&category=${encodeURIComponent(filters.category)}`;
    }
    if (filters.search) {
      query += `&search=${encodeURIComponent(filters.search)}`;
    }
    if (filters.minPrice > 0) {
      query += `&minPrice=${filters.minPrice}`;
    }
    if (filters.maxPrice < 1200) {
      query += `&maxPrice=${filters.maxPrice}`;
    }
    if (filters.sort) {
      query += `&sort=${filters.sort}`;
    }

    try {
      const data = await API.get(query);
      if (data.success) {
        renderProducts(data.products);
        renderPagination(data.page, data.pages);
        if (resultsCountText) {
          resultsCountText.textContent = `Showing ${data.products.length} of ${data.total} products`;
        }
      }
    } catch (err) {
      showToast(err.message || 'Error fetching products', 'error');
      productsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--danger);">Failed to load products.</div>';
    } finally {
      showLoader(false);
    }
  };

  const renderProducts = (products) => {
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>No products match your active filters.</p>
        </div>
      `;
      return;
    }

    products.forEach(product => {
      productsGrid.appendChild(createProductCard(product));
    });
  };

  // 5. Pagination rendering
  const renderPagination = (currentPage, totalPages) => {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    // Previous Arrow
    const prevBtn = document.createElement('div');
    prevBtn.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    if (currentPage > 1) {
      prevBtn.addEventListener('click', () => {
        filters.page = currentPage - 1;
        fetchProducts();
        window.scrollTo(0, 0);
      });
    }
    paginationContainer.appendChild(prevBtn);

    // Number Buttons
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('div');
      pageBtn.className = `page-item ${currentPage === i ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        filters.page = i;
        fetchProducts();
        window.scrollTo(0, 0);
      });
      paginationContainer.appendChild(pageBtn);
    }

    // Next Arrow
    const nextBtn = document.createElement('div');
    nextBtn.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    if (currentPage < totalPages) {
      nextBtn.addEventListener('click', () => {
        filters.page = currentPage + 1;
        fetchProducts();
        window.scrollTo(0, 0);
      });
    }
    paginationContainer.appendChild(nextBtn);
  };

  // 6. Interactive Event Handlers
  
  // Category selection click
  if (categoryFilterBtns) {
    categoryFilterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        categoryFilterBtns.forEach(b => b.classList.remove('active'));
        
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        
        filters.category = targetBtn.getAttribute('data-category');
        filters.page = 1;
        fetchProducts();
      });
    });
  }

  // Search filter inside sidebar (debounced)
  if (sidebarSearch) {
    let searchTimer;
    sidebarSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filters.search = sidebarSearch.value.trim();
        filters.page = 1;
        fetchProducts();
      }, 400);
    });
  }

  // Price Range inputs and slider linking
  const handlePriceChange = () => {
    filters.minPrice = Number(minPriceInput.value) || 0;
    filters.maxPrice = Number(maxPriceInput.value) || 1200;
    filters.page = 1;
    fetchProducts();
  };

  if (priceSlider) {
    priceSlider.addEventListener('input', () => {
      maxPriceInput.value = priceSlider.value;
    });
    priceSlider.addEventListener('change', () => {
      handlePriceChange();
    });
  }

  if (minPriceInput) {
    minPriceInput.addEventListener('change', () => {
      handlePriceChange();
    });
  }

  if (maxPriceInput) {
    maxPriceInput.addEventListener('change', () => {
      priceSlider.value = maxPriceInput.value;
      handlePriceChange();
    });
  }

  // Sorting
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      filters.sort = sortSelect.value;
      filters.page = 1;
      fetchProducts();
    });
  }

  // Clear all filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      filters = {
        page: 1,
        limit: 6,
        category: 'All',
        search: '',
        minPrice: 0,
        maxPrice: 1200,
        sort: 'newest'
      };

      if (sidebarSearch) sidebarSearch.value = '';
      if (minPriceInput) minPriceInput.value = 0;
      if (maxPriceInput) maxPriceInput.value = 1200;
      if (priceSlider) priceSlider.value = 1200;
      if (sortSelect) sortSelect.value = 'newest';

      categoryFilterBtns.forEach(b => {
        if (b.getAttribute('data-category') === 'All') {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      fetchProducts();
    });
  }

  // Run initialization
  parseUrlParams();
  fetchProducts();
});
