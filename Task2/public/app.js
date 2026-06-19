/* -------------------------------------------------------------
 * CONNECTHUB CORE CLIENT SIDE APPLICATION
 * Single Page Application router, local storage state caching,
 * API fetch client, dynamic layouts engine, and visual interactions.
 * ------------------------------------------------------------- */

// App State Cache
const state = {
  token: localStorage.getItem('ch_token') || null,
  user: JSON.parse(localStorage.getItem('ch_user')) || null,
  unreadCount: 0,
  feedPage: 1,
  feedLoading: false,
  feedHasMore: true,
  currentFeedPosts: []
};

// API Endpoint configuration
const API_URL = '/api';

// Relative Time Helper
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  
  if (isNaN(date.getTime())) return 'Recently';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// -------------------------------------------------------------
// TOAST NOTIFICATIONS WRAPPER
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  toast.className = `toast ${type} ${isLight ? 'toast-light' : ''}`;

  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// API CLIENT WRAPPER
// -------------------------------------------------------------
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
  const headers = {};
  
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      // Handle unauthorized session expiration
      if (res.status === 401 && state.token) {
        logoutUser();
        showToast('Your session has expired. Please log in again.', 'error');
        return null;
      }
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error.message);
    showToast(error.message, 'error');
    return null;
  }
}

// -------------------------------------------------------------
// SESSION CONTROL
// -------------------------------------------------------------
function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('ch_token', token);
  localStorage.setItem('ch_user', JSON.stringify(user));
  
  // Render application shell
  document.getElementById('guest-wrapper').classList.add('hidden');
  document.getElementById('app-wrapper').classList.remove('hidden');

  // Set Nav Avatar and Name
  updateNavProfileData();
  
  // Start background notifications checker
  startNotificationsPolling();
}

function logoutUser() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('ch_token');
  localStorage.removeItem('ch_user');
  stopNotificationsPolling();
  
  document.getElementById('app-wrapper').classList.add('hidden');
  document.getElementById('guest-wrapper').classList.remove('hidden');
  
  window.location.hash = '#/login';
}

function updateNavProfileData() {
  if (!state.user) return;
  
  const avatar = document.getElementById('nav-user-avatar');
  const name = document.getElementById('nav-user-name');
  const myProfileLink = document.getElementById('nav-link-myprofile');
  const mobileProfileLink = document.getElementById('mobile-link-myprofile');

  if (avatar) {
    if (state.user.profilePicture) {
      avatar.src = state.user.profilePicture;
      avatar.classList.remove('fallback-avatar');
    } else {
      avatar.src = '';
      avatar.classList.add('fallback-avatar');
    }
  }

  if (name) name.textContent = state.user.username;
  
  const profileHash = `#/profile/${state.user.username}`;
  if (myProfileLink) myProfileLink.href = profileHash;
  if (mobileProfileLink) mobileProfileLink.href = profileHash;
}

// -------------------------------------------------------------
// APP INITIALIZATION & THEME CONTROLS
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Theme management
  const savedTheme = localStorage.getItem('ch_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ch_theme', newTheme);
      showToast(`Switched to ${newTheme} mode!`, 'info');
    });
  }

  // Setup Global Form Listeners (Modals triggers, logouts)
  setupGlobalDOMListeners();

  // Load SPA session check
  if (state.token && state.user) {
    document.getElementById('guest-wrapper').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');
    updateNavProfileData();
    startNotificationsPolling();
  } else {
    document.getElementById('app-wrapper').classList.add('hidden');
    document.getElementById('guest-wrapper').classList.remove('hidden');
  }

  // Bind Router Events
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('load', handleRoute);
  
  // Set default route
  if (!window.location.hash) {
    window.location.hash = '#/';
  }
});

// -------------------------------------------------------------
// GLOBAL DYNAMIC ROUTER
// -------------------------------------------------------------
function handleRoute() {
  const hash = window.location.hash || '#/';
  
  // Clean scroll listeners on navigating away from lists
  window.onscroll = null;

  // Route Authentication Guard
  if (!state.token) {
    if (hash !== '#/login' && hash !== '#/register') {
      window.location.hash = '#/login';
      return;
    }
  } else {
    if (hash === '#/login' || hash === '#/register') {
      window.location.hash = '#/';
      return;
    }
  }

  // Update active navigation indicators
  updateActiveNavigation(hash);

  // Router matching
  if (hash === '#/') {
    renderFeedPage();
  } else if (hash === '#/explore') {
    renderExplorePage();
  } else if (hash === '#/notifications') {
    renderNotificationsPage();
  } else if (hash === '#/analytics') {
    renderAnalyticsPage();
  } else if (hash === '#/login') {
    renderLoginPage();
  } else if (hash === '#/register') {
    renderRegisterPage();
  } else if (hash.startsWith('#/profile/')) {
    const username = hash.split('/')[2];
    renderProfilePage(username);
  } else if (hash.startsWith('#/search/')) {
    const keyword = decodeURIComponent(hash.split('/')[2]);
    renderSearchPage(keyword);
  } else {
    // 404 Route
    document.getElementById('app-content').innerHTML = `
      <div class="card text-center" style="padding: 3rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <h2>Page Not Found</h2>
        <p style="color: var(--text-secondary); margin-top: 0.5rem;">The page you are looking for does not exist.</p>
        <a href="#/" class="btn btn-primary" style="margin-top: 1.5rem;">Return Home</a>
      </div>
    `;
  }
}

function updateActiveNavigation(hash) {
  // Clear all active classes
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active');
  });

  let targetRoute = 'feed';
  if (hash === '#/') targetRoute = 'feed';
  else if (hash === '#/explore') targetRoute = 'explore';
  else if (hash === '#/notifications') targetRoute = 'notifications';
  else if (hash === '#/analytics') targetRoute = 'analytics';
  else if (hash.startsWith('#/profile/')) {
    const username = hash.split('/')[2];
    if (state.user && username === state.user.username) {
      targetRoute = 'profile';
    } else {
      targetRoute = 'none';
    }
  }

  document.querySelectorAll(`.nav-link[data-route="${targetRoute}"], .mobile-nav-link[data-route="${targetRoute}"]`).forEach(link => {
    link.classList.add('active');
  });
}

// -------------------------------------------------------------
// DYNAMIC VIEWS GENERATION
// -------------------------------------------------------------

// --- 1. HOME NEWS FEED ---
async function renderFeedPage() {
  const content = document.getElementById('app-content');
  state.feedPage = 1;
  state.feedHasMore = true;
  state.feedLoading = false;
  
  content.innerHTML = `
    <div class="feed-container">
      <!-- Create Post Entry Bar -->
      <div class="card" style="display: flex; gap: 1rem; align-items: center; cursor: pointer; padding: 1.25rem;" id="feed-create-shortcut">
        <img src="" alt="Me" class="avatar-sm fallback-avatar" id="feed-avatar-shortcut">
        <div style="flex: 1; background: var(--bg-hover); padding: 0.75rem 1.25rem; border-radius: 99px; color: var(--text-secondary); font-size: 0.95rem; border: 1px solid var(--border-color);">
          What's on your mind, ${state.user.username}?
        </div>
      </div>
      
      <!-- Posts Feed List -->
      <div id="posts-feed-target"></div>
      
      <!-- Loading Indicator -->
      <div id="feed-loader" class="hidden text-center" style="padding: 1.5rem;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.5rem; color: var(--accent-color);"></i>
      </div>
    </div>
  `;

  // Bind shortcut trigger
  document.getElementById('feed-create-shortcut').addEventListener('click', openCreatePostModal);
  
  // Set avatar shortcut image
  const shortcutAvatar = document.getElementById('feed-avatar-shortcut');
  if (state.user.profilePicture) {
    shortcutAvatar.src = state.user.profilePicture;
    shortcutAvatar.classList.remove('fallback-avatar');
  }

  // Load first batch of feed posts
  await loadMoreFeedPosts();

  // Setup infinite scrolling event listener
  window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 150) {
      loadMoreFeedPosts();
    }
  };
}

async function loadMoreFeedPosts() {
  if (state.feedLoading || !state.feedHasMore) return;
  state.feedLoading = true;
  
  const loader = document.getElementById('feed-loader');
  const feedTarget = document.getElementById('posts-feed-target');
  
  if (loader) loader.classList.remove('hidden');

  // If first page, show skeleton placeholder
  if (state.feedPage === 1 && feedTarget) {
    feedTarget.innerHTML = getLoadingSkeletons(3);
  }

  const response = await apiCall(`/posts/feed?page=${state.feedPage}&limit=5`, 'GET');
  
  if (loader) loader.classList.add('hidden');
  state.feedLoading = false;

  if (!response || !response.success) {
    if (state.feedPage === 1 && feedTarget) feedTarget.innerHTML = '<p class="text-center">Could not load feed.</p>';
    return;
  }

  const posts = response.data;
  
  if (state.feedPage === 1) {
    feedTarget.innerHTML = '';
    state.currentFeedPosts = [];
  }

  if (posts.length === 0 && state.feedPage === 1) {
    feedTarget.innerHTML = `
      <div class="card text-center" style="padding: 3rem;">
        <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <h3>Your feed is empty!</h3>
        <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.95rem;">Follow suggestions and friends on the Explore page to populate your feed.</p>
        <a href="#/explore" class="btn btn-primary" style="margin-top: 1.5rem;">Explore ConnectHub</a>
      </div>
    `;
    state.feedHasMore = false;
    return;
  }

  posts.forEach(post => {
    state.currentFeedPosts.push(post);
    feedTarget.appendChild(buildPostCard(post));
  });

  state.feedHasMore = response.pagination.hasNextPage;
  if (state.feedHasMore) {
    state.feedPage += 1;
  }
}

// --- 2. EXPLORE PAGE ---
async function renderExplorePage() {
  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="explore-grid">
      <!-- Main Content Feed -->
      <div class="explore-main">
        <h2 class="section-title">Explore Posts</h2>
        <div id="explore-posts-target"></div>
      </div>
      
      <!-- Suggestions Sidebar -->
      <div class="explore-sidebar">
        <!-- Dashboard Analytics Shortcut -->
        <div class="card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <h4 style="font-family: var(--font-logo); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-chart-line" style="color: var(--accent-color);"></i> Dashboard
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Track posts, followers, and engagement metrics.</p>
          <a href="#/analytics" class="btn btn-secondary btn-sm" style="text-align: center; font-size: 0.8rem; padding: 0.4rem;">View Analytics</a>
        </div>
        
        <!-- Suggested Accounts -->
        <div class="suggestions-container">
          <h4 style="font-family: var(--font-logo); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-user-plus" style="color: var(--accent-color);"></i> Suggested for you
          </h4>
          <div id="explore-suggestions-target" class="suggestions-list">
            <!-- Loaded dynamically -->
          </div>
        </div>

        <!-- Trending Posts -->
        <div class="trending-container">
          <h4 style="font-family: var(--font-logo); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-fire" style="color: var(--danger-color);"></i> Trending posts
          </h4>
          <div id="explore-trending-target" class="trending-list">
            <!-- Loaded dynamically -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Pre-load skeletons
  const postsTarget = document.getElementById('explore-posts-target');
  const suggestionsTarget = document.getElementById('explore-suggestions-target');
  const trendingTarget = document.getElementById('explore-trending-target');
  
  if (postsTarget) postsTarget.innerHTML = getLoadingSkeletons(2);
  
  // Fetch Explore data
  const exploreRes = await apiCall('/posts/explore', 'GET');
  const suggestionsRes = await apiCall('/users/suggestions', 'GET');

  // Render Suggestions
  if (suggestionsTarget && suggestionsRes && suggestionsRes.success) {
    suggestionsTarget.innerHTML = '';
    const users = suggestionsRes.data;
    if (users.length === 0) {
      suggestionsTarget.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No suggestions available</p>';
    } else {
      users.forEach(u => {
        const item = document.createElement('div');
        item.className = 'suggestion-card';
        
        const avatarHtml = u.profilePicture 
          ? `<img src="${u.profilePicture}" alt="${u.username}" class="avatar-sm">`
          : `<img src="" alt="${u.username}" class="avatar-sm fallback-avatar">`;

        item.innerHTML = `
          <div class="suggestion-user-info">
            <a href="#/profile/${u.username}">${avatarHtml}</a>
            <div class="suggestion-meta">
              <a href="#/profile/${u.username}" class="suggestion-name">${u.username}</a>
              <span class="suggestion-subtext">${u.location || 'ConnectHub User'}</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-follow-toggle" data-user-id="${u._id}" style="font-size: 0.75rem; padding: 0.3rem 0.7rem;">Follow</button>
        `;
        
        // Bind follow event
        item.querySelector('.btn-follow-toggle').addEventListener('click', async (e) => {
          const btn = e.target;
          const uId = btn.getAttribute('data-user-id');
          btn.disabled = true;
          
          const followRes = await apiCall(`/follows/follow/${uId}`, 'POST');
          if (followRes && followRes.success) {
            showToast(followRes.message, 'success');
            btn.textContent = 'Following';
            btn.className = 'btn btn-secondary';
            btn.disabled = true;
            // Sync current user local cache
            if (!state.user.following.includes(uId)) {
              state.user.following.push(uId);
              localStorage.setItem('ch_user', JSON.stringify(state.user));
              updateNavProfileData();
            }
          } else {
            btn.disabled = false;
          }
        });

        suggestionsTarget.appendChild(item);
      });
    }
  }

  // Render Explore Posts Feed
  if (postsTarget && exploreRes && exploreRes.success) {
    postsTarget.innerHTML = '';
    const posts = exploreRes.data;
    if (posts.length === 0) {
      postsTarget.innerHTML = '<p class="text-center">No posts discoverable.</p>';
    } else {
      posts.forEach(p => {
        postsTarget.appendChild(buildPostCard(p));
      });
    }

    // Render Trending widget
    if (trendingTarget) {
      trendingTarget.innerHTML = '';
      const trending = exploreRes.trending;
      if (!trending || trending.length === 0) {
        trendingTarget.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No trending posts</p>';
      } else {
        trending.forEach((tp, index) => {
          const tItem = document.createElement('div');
          tItem.className = 'trending-item';
          tItem.innerHTML = `
            <span style="font-weight: 800; font-size: 1.1rem; color: var(--accent-color); min-width: 20px;">#${index+1}</span>
            <div class="trending-info">
              <a href="#/profile/${tp.userId.username}" style="font-size: 0.8rem; font-weight:700;">@${tp.userId.username}</a>
              <p class="trending-title">${tp.content || 'Image post'}</p>
              <span class="trending-item-likes"><i class="fa-solid fa-heart"></i> ${tp.likes.length} likes</span>
            </div>
          `;
          trendingTarget.appendChild(tItem);
        });
      }
    }
  }
}

// --- 3. NOTIFICATIONS PAGE ---
async function renderNotificationsPage() {
  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="notifications-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h2 class="section-title" style="margin: 0; border: none;">Notifications</h2>
        <button id="btn-mark-all-read" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">
          <i class="fa-solid fa-check-double"></i> Mark all read
        </button>
      </div>
      <div id="notifications-target"></div>
    </div>
  `;

  const target = document.getElementById('notifications-target');
  target.innerHTML = getLoadingSkeletons(2);

  const response = await apiCall('/notifications', 'GET');
  
  if (!response || !response.success) {
    target.innerHTML = '<p class="text-center">Could not load notifications.</p>';
    return;
  }

  const notifications = response.data;
  target.innerHTML = '';

  if (notifications.length === 0) {
    target.innerHTML = `
      <div class="card text-center" style="padding: 3rem;">
        <i class="fa-regular fa-bell" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <h3>No Notifications yet</h3>
        <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.95rem;">Activities like followers, comments, and likes will appear here.</p>
      </div>
    `;
    return;
  }

  notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = `notification-item ${n.isRead ? '' : 'unread'}`;
    
    let text = '';
    let badgeClass = '';
    let icon = '';

    if (n.type === 'like') {
      text = 'liked your post.';
      badgeClass = 'like';
      icon = '<i class="fa-solid fa-heart"></i>';
    } else if (n.type === 'comment') {
      text = 'commented on your post.';
      badgeClass = 'comment';
      icon = '<i class="fa-solid fa-comment"></i>';
    } else if (n.type === 'follow') {
      text = 'started following you.';
      badgeClass = 'follow';
      icon = '<i class="fa-solid fa-user-plus"></i>';
    }

    const senderAvatar = n.senderId.profilePicture
      ? `<img src="${n.senderId.profilePicture}" alt="avatar" class="avatar-md">`
      : `<img src="" alt="avatar" class="avatar-md fallback-avatar">`;

    let mediaPreview = '';
    if (n.postId && n.postId.image) {
      mediaPreview = `<div class="notification-media-preview"><img src="${n.postId.image}" alt="Preview"></div>`;
    }

    item.innerHTML = `
      <div class="notification-sender">
        <div style="position: relative;">
          <a href="#/profile/${n.senderId.username}">${senderAvatar}</a>
          <span class="notification-type-badge ${badgeClass}">${icon}</span>
        </div>
        <div class="notification-text">
          <a href="#/profile/${n.senderId.username}" class="notification-username">${n.senderId.username}</a>
          <span>${text}</span>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${formatRelativeTime(n.createdAt)}</div>
        </div>
      </div>
      ${mediaPreview}
    `;

    target.appendChild(item);
  });

  // Bind mark all read
  document.getElementById('btn-mark-all-read').addEventListener('click', async () => {
    const markRes = await apiCall('/notifications/read', 'PUT');
    if (markRes && markRes.success) {
      showToast('All notifications marked as read', 'success');
      
      // Update ui items visually
      document.querySelectorAll('.notification-item.unread').forEach(el => {
        el.classList.remove('unread');
      });

      // Clear badges
      state.unreadCount = 0;
      updateNotificationBadges();
    }
  });

  // Also proactively mark them read in backend when loading the page
  if (notifications.some(n => !n.isRead)) {
    apiCall('/notifications/read', 'PUT').then(res => {
      if (res && res.success) {
        state.unreadCount = 0;
        updateNotificationBadges();
      }
    });
  }
}

// --- 4. PROFILE PAGE & FOLLOWERS SYSTEM ---
async function renderProfilePage(username) {
  const content = document.getElementById('app-content');
  
  content.innerHTML = `
    <div class="profile-container">
      <div id="profile-card-target"></div>
      
      <div class="profile-posts-section">
        <h3 class="section-title">Posts</h3>
        <div id="profile-posts-target"></div>
      </div>
    </div>
  `;

  const cardTarget = document.getElementById('profile-card-target');
  const postsTarget = document.getElementById('profile-posts-target');

  cardTarget.innerHTML = `
    <div class="profile-card text-center">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--accent-color);"></i>
    </div>
  `;
  postsTarget.innerHTML = getLoadingSkeletons(1);

  // Fetch target profile
  const profileRes = await apiCall(`/users/profile/${username}`, 'GET');
  
  if (!profileRes || !profileRes.success) {
    cardTarget.innerHTML = `
      <div class="card text-center" style="padding: 2rem;">
        <h3>User not found</h3>
        <a href="#/" class="btn btn-primary" style="margin-top: 1rem;">Back Home</a>
      </div>
    `;
    postsTarget.innerHTML = '';
    return;
  }

  const pData = profileRes.data;
  const isOwnProfile = state.user && pData.username === state.user.username;

  // Build Profile Avatar HTML
  const avatarHtml = pData.profilePicture
    ? `<img src="${pData.profilePicture}" alt="${pData.username}" class="avatar-lg">`
    : `<img src="" alt="${pData.username}" class="avatar-lg fallback-avatar">`;

  // Build Action Button (Edit profile vs Follow/Unfollow)
  let actionButtonHtml = '';
  if (isOwnProfile) {
    actionButtonHtml = `<button class="btn btn-secondary" id="btn-trigger-edit-profile"><i class="fa-solid fa-pen-to-square"></i> Edit Profile</button>`;
  } else {
    const btnClass = pData.isFollowing ? 'btn btn-secondary' : 'btn btn-primary';
    const btnLabel = pData.isFollowing ? 'Following' : 'Follow';
    actionButtonHtml = `<button class="btn ${btnClass}" id="btn-profile-follow-toggle" data-user-id="${pData._id}">${btnLabel}</button>`;
  }

  // Populate Profile Header Card
  cardTarget.innerHTML = `
    <div class="profile-card">
      <div class="profile-layout-header">
        <div class="profile-avatar-container">
          ${avatarHtml}
        </div>
        <div class="profile-info">
          <div class="profile-identity">
            <h2 class="profile-username">@${pData.username}</h2>
            ${actionButtonHtml}
          </div>
          
          <div class="profile-stats-row">
            <div>
              <span class="profile-stat-count">${pData.posts.length}</span>
              <span class="profile-stat-label">posts</span>
            </div>
            <div id="stat-trigger-followers">
              <span class="profile-stat-count" id="header-followers-count">${pData.followers.length}</span>
              <span class="profile-stat-label">followers</span>
            </div>
            <div id="stat-trigger-following">
              <span class="profile-stat-count">${pData.following.length}</span>
              <span class="profile-stat-label">following</span>
            </div>
          </div>
          
          <div class="profile-details-content">
            <p class="profile-bio">${pData.bio || 'No bio yet.'}</p>
            <div class="profile-meta-row">
              ${pData.location ? `<span><i class="fa-solid fa-location-dot"></i> ${pData.location}</span>` : ''}
              ${pData.website ? `<span><i class="fa-solid fa-link"></i> <a href="${pData.website}" target="_blank" rel="noopener noreferrer">${pData.website.replace(/^https?:\/\//, '')}</a></span>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind edit profile modal trigger
  if (isOwnProfile) {
    document.getElementById('btn-trigger-edit-profile').addEventListener('click', () => {
      // Set input values
      document.getElementById('edit-bio').value = pData.bio || '';
      document.getElementById('edit-location').value = pData.location || '';
      document.getElementById('edit-website').value = pData.website || '';
      
      const avatarPreview = document.getElementById('edit-avatar-preview');
      if (pData.profilePicture) {
        avatarPreview.src = pData.profilePicture;
        avatarPreview.classList.remove('fallback-avatar');
      } else {
        avatarPreview.src = '';
        avatarPreview.classList.add('fallback-avatar');
      }

      openEditProfileModal();
    });
  } else {
    // Bind Follow/Unfollow toggle
    const followBtn = document.getElementById('btn-profile-follow-toggle');
    followBtn.addEventListener('click', async () => {
      followBtn.disabled = true;
      const followingId = followBtn.getAttribute('data-user-id');
      const currentlyFollowing = followBtn.classList.contains('btn-secondary');

      if (currentlyFollowing) {
        // Unfollow
        const res = await apiCall(`/follows/unfollow/${followingId}`, 'POST');
        if (res && res.success) {
          showToast(res.message, 'info');
          followBtn.textContent = 'Follow';
          followBtn.className = 'btn btn-primary';
          // Decrement followers UI count
          const countEl = document.getElementById('header-followers-count');
          countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
          // Sync following cache
          state.user.following = state.user.following.filter(id => id !== followingId);
          localStorage.setItem('ch_user', JSON.stringify(state.user));
          updateNavProfileData();
        }
      } else {
        // Follow
        const res = await apiCall(`/follows/follow/${followingId}`, 'POST');
        if (res && res.success) {
          showToast(res.message, 'success');
          followBtn.textContent = 'Following';
          followBtn.className = 'btn btn-secondary';
          // Increment followers UI count
          const countEl = document.getElementById('header-followers-count');
          countEl.textContent = parseInt(countEl.textContent) + 1;
          // Sync following cache
          if (!state.user.following.includes(followingId)) {
            state.user.following.push(followingId);
            localStorage.setItem('ch_user', JSON.stringify(state.user));
            updateNavProfileData();
          }
        }
      }
      followBtn.disabled = false;
    });
  }

  // Bind Followers/Following Modal view triggers
  document.getElementById('stat-trigger-followers').addEventListener('click', () => {
    openUsersModal(pData.followers, 'Followers');
  });

  document.getElementById('stat-trigger-following').addEventListener('click', () => {
    openUsersModal(pData.following, 'Following');
  });

  // Render User Posts
  postsTarget.innerHTML = '';
  const posts = pData.posts;
  if (posts.length === 0) {
    postsTarget.innerHTML = `
      <div class="card text-center" style="padding: 2.5rem; background: transparent; border-style: dashed;">
        <i class="fa-regular fa-images" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
        <p style="color: var(--text-secondary);">No posts shared yet</p>
      </div>
    `;
    return;
  }

  posts.forEach(post => {
    // Post cards require author details. Since user profile already contains username and profile picture, we inject it manually.
    post.userId = {
      _id: pData._id,
      username: pData.username,
      profilePicture: pData.profilePicture
    };
    postsTarget.appendChild(buildPostCard(post));
  });
}

// Helper to launch followers/following lists popup modal
function openUsersModal(users, title) {
  const modal = document.getElementById('likes-modal');
  modal.querySelector('h3').textContent = title;
  const container = document.getElementById('likes-list-container');
  container.innerHTML = '';

  if (users.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No users found</p>`;
  } else {
    users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'user-item-card';

      const avatarHtml = u.profilePicture
        ? `<img src="${u.profilePicture}" alt="avatar" class="avatar-sm">`
        : `<img src="" alt="avatar" class="avatar-sm fallback-avatar">`;

      card.innerHTML = `
        <div class="user-item-meta">
          <a href="#/profile/${u.username}" class="modal-close-trigger">${avatarHtml}</a>
          <a href="#/profile/${u.username}" class="user-item-username modal-close-trigger">@${u.username}</a>
        </div>
      `;
      
      // Close modal on link click
      card.querySelectorAll('.modal-close-trigger').forEach(el => {
        el.addEventListener('click', () => {
          modal.classList.add('hidden');
        });
      });

      container.appendChild(card);
    });
  }

  modal.classList.remove('hidden');
}

// --- 5. DASHBOARD ANALYTICS ---
async function renderAnalyticsPage() {
  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="analytics-container">
      <h2 class="section-title">Dashboard Analytics</h2>
      
      <div id="analytics-loader" class="text-center" style="padding: 3rem;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--accent-color);"></i>
      </div>

      <div id="analytics-grid-target" class="analytics-grid hidden">
        <!-- Dashboard items rendered dynamically -->
      </div>
    </div>
  `;

  const loader = document.getElementById('analytics-loader');
  const target = document.getElementById('analytics-grid-target');

  const res = await apiCall('/users/analytics', 'GET');
  if (loader) loader.remove();

  if (!res || !res.success) {
    content.innerHTML += `<p class="text-center">Could not load analytics metrics.</p>`;
    return;
  }

  const metrics = res.data;
  target.innerHTML = `
    <div class="analytics-card">
      <div class="analytics-icon-wrapper"><i class="fa-solid fa-signs-post"></i></div>
      <div class="analytics-value">${metrics.totalPosts}</div>
      <div class="analytics-label">Total Posts</div>
    </div>
    
    <div class="analytics-card">
      <div class="analytics-icon-wrapper"><i class="fa-solid fa-users"></i></div>
      <div class="analytics-value">${metrics.totalFollowers}</div>
      <div class="analytics-label">Followers</div>
    </div>
    
    <div class="analytics-card">
      <div class="analytics-icon-wrapper"><i class="fa-solid fa-user-group"></i></div>
      <div class="analytics-value">${metrics.totalFollowing}</div>
      <div class="analytics-label">Following</div>
    </div>
    
    <div class="analytics-card">
      <div class="analytics-icon-wrapper"><i class="fa-solid fa-heart"></i></div>
      <div class="analytics-value">${metrics.totalLikesReceived}</div>
      <div class="analytics-label">Likes Received</div>
    </div>
  `;

  target.classList.remove('hidden');
}

// --- 6. SEARCH & DISCOVERY RESULTS ---
async function renderSearchPage(keyword) {
  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <h2 class="section-title" style="margin-bottom: 0.5rem;">Search Results for "${keyword}"</h2>
      </div>

      <!-- Navigation Tabs (Users vs Posts) -->
      <div style="display: flex; gap: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <button id="search-tab-users" class="btn btn-primary" style="font-size: 0.85rem; padding: 0.4rem 1rem;">Users</button>
        <button id="search-tab-posts" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 1rem;">Posts</button>
      </div>

      <!-- Search content targets -->
      <div id="search-users-results" class="users-list"></div>
      <div id="search-posts-results" class="feed-container hidden"></div>
    </div>
  `;

  const usersTarget = document.getElementById('search-users-results');
  const postsTarget = document.getElementById('search-posts-results');
  const tabUsers = document.getElementById('search-tab-users');
  const tabPosts = document.getElementById('search-tab-posts');

  usersTarget.innerHTML = getLoadingSkeletons(1);

  // Trigger both parallel fetches
  const usersRes = await apiCall(`/users/search?query=${encodeURIComponent(keyword)}`, 'GET');
  const postsRes = await apiCall(`/posts/search?query=${encodeURIComponent(keyword)}`, 'GET');

  usersTarget.innerHTML = '';
  postsTarget.innerHTML = '';

  // Handle Users Tab render
  if (usersRes && usersRes.success) {
    const users = usersRes.data;
    if (users.length === 0) {
      usersTarget.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No users match "${keyword}"</p>`;
    } else {
      users.forEach(u => {
        const row = document.createElement('div');
        row.className = 'card user-item-card';
        row.style.padding = '1rem 1.5rem';

        const avatar = u.profilePicture
          ? `<img src="${u.profilePicture}" alt="profile" class="avatar-md">`
          : `<img src="" alt="profile" class="avatar-md fallback-avatar">`;

        // Check follow relation
        const isSelf = state.user && u._id === state.user._id;
        const isFollowing = state.user && state.user.following.includes(u._id);
        
        let actBtn = '';
        if (!isSelf) {
          actBtn = isFollowing 
            ? `<button class="btn btn-secondary follow-toggle-btn" data-id="${u._id}" style="font-size: 0.8rem; padding: 0.35rem 0.8rem;">Following</button>`
            : `<button class="btn btn-primary follow-toggle-btn" data-id="${u._id}" style="font-size: 0.8rem; padding: 0.35rem 0.8rem;">Follow</button>`;
        }

        row.innerHTML = `
          <div class="user-item-meta">
            <a href="#/profile/${u.username}">${avatar}</a>
            <div style="display: flex; flex-direction: column;">
              <a href="#/profile/${u.username}" style="font-weight: 600; font-size: 0.95rem;">@${u.username}</a>
              <span style="font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.bio || 'ConnectHub user'}</span>
            </div>
          </div>
          ${actBtn}
        `;

        if (row.querySelector('.follow-toggle-btn')) {
          row.querySelector('.follow-toggle-btn').addEventListener('click', async (e) => {
            const btn = e.target;
            const uId = btn.getAttribute('data-id');
            const following = btn.textContent === 'Following';
            
            btn.disabled = true;
            if (following) {
              const uRes = await apiCall(`/follows/unfollow/${uId}`, 'POST');
              if (uRes && uRes.success) {
                showToast(uRes.message, 'info');
                btn.textContent = 'Follow';
                btn.className = 'btn btn-primary';
                state.user.following = state.user.following.filter(id => id !== uId);
                localStorage.setItem('ch_user', JSON.stringify(state.user));
                updateNavProfileData();
              }
            } else {
              const fRes = await apiCall(`/follows/follow/${uId}`, 'POST');
              if (fRes && fRes.success) {
                showToast(fRes.message, 'success');
                btn.textContent = 'Following';
                btn.className = 'btn btn-secondary';
                if (!state.user.following.includes(uId)) {
                  state.user.following.push(uId);
                  localStorage.setItem('ch_user', JSON.stringify(state.user));
                  updateNavProfileData();
                }
              }
            }
            btn.disabled = false;
          });
        }

        usersTarget.appendChild(row);
      });
    }
  }

  // Handle Posts Tab render
  if (postsRes && postsRes.success) {
    const posts = postsRes.data;
    if (posts.length === 0) {
      postsTarget.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No posts contain "${keyword}"</p>`;
    } else {
      posts.forEach(p => {
        postsTarget.appendChild(buildPostCard(p));
      });
    }
  }

  // Tab navigation bindings
  tabUsers.addEventListener('click', () => {
    tabUsers.className = 'btn btn-primary';
    tabPosts.className = 'btn btn-secondary';
    usersTarget.classList.remove('hidden');
    postsTarget.classList.add('hidden');
  });

  tabPosts.addEventListener('click', () => {
    tabUsers.className = 'btn btn-secondary';
    tabPosts.className = 'btn btn-primary';
    usersTarget.classList.add('hidden');
    postsTarget.classList.remove('hidden');
  });
}

// -------------------------------------------------------------
// COMPONENT BUILDER: DYNAMIC POST CARD & COMMENTS VIEW
// -------------------------------------------------------------
function buildPostCard(post) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = `post-card-${post._id}`;

  const isOwnPost = state.user && post.userId._id === state.user._id;
  const isLiked = state.user && post.likes.some(u => (u._id || u) === state.user._id);

  // Author details
  const authorAvatar = post.userId.profilePicture
    ? `<img src="${post.userId.profilePicture}" alt="${post.userId.username}" class="avatar-sm">`
    : `<img src="" alt="${post.userId.username}" class="avatar-sm fallback-avatar">`;

  // Actions menu button if own post
  let actionBtnHtml = '';
  if (isOwnPost) {
    actionBtnHtml = `
      <div class="post-actions-menu">
        <button class="icon-btn post-action-trigger" style="width: 32px; height: 32px; font-size: 0.9rem;" title="Options">
          <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
        <div class="action-menu-dropdown hidden">
          <button class="edit-post-btn"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="delete-btn delete-post-btn"><i class="fa-solid fa-trash-can"></i> Delete</button>
        </div>
      </div>
    `;
  }

  // Post Image html
  let imgHtml = '';
  if (post.image) {
    imgHtml = `
      <div class="post-image-container">
        <img src="${post.image}" alt="Post image">
      </div>
    `;
  }

  card.innerHTML = `
    <div class="post-header">
      <div class="post-meta">
        <a href="#/profile/${post.userId.username}">${authorAvatar}</a>
        <div class="post-author-info">
          <a href="#/profile/${post.userId.username}" class="post-author-name">@${post.userId.username}</a>
          <span class="post-time">${formatRelativeTime(post.createdAt)}</span>
        </div>
      </div>
      ${actionBtnHtml}
    </div>
    
    <div class="post-content">${post.content}</div>
    ${imgHtml}
    
    <div class="post-stats">
      <div class="stat-item count-likes-trigger"><span class="likes-count-val">${post.likes.length}</span> likes</div>
      <div class="stat-item count-comments-trigger"><span class="comments-count-val">${post.commentsCount || 0}</span> comments</div>
    </div>
    
    <div class="post-footer-actions">
      <button class="post-footer-btn like-btn ${isLiked ? 'liked' : ''}">
        <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> Like
      </button>
      <button class="post-footer-btn comments-btn-toggle">
        <i class="fa-regular fa-comment"></i> Comment
      </button>
    </div>

    <!-- Collapsible Comments Drawer -->
    <div class="comments-section hidden" id="comments-section-${post._id}">
      <div class="comments-list" id="comments-list-${post._id}"></div>
      
      <form class="add-comment-container" id="comment-form-${post._id}">
        <div class="comment-input-wrapper">
          <input type="text" placeholder="Add a comment..." required autocomplete="off" id="comment-input-field-${post._id}">
        </div>
        <button type="submit" class="btn-send-comment"><i class="fa-solid fa-paper-plane"></i></button>
      </form>
    </div>
  `;

  // Bind Actions dropdown
  if (isOwnPost) {
    const trigger = card.querySelector('.post-action-trigger');
    const dropdown = card.querySelector('.action-menu-dropdown');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      dropdown.classList.add('hidden');
    });

    // Bind Edit Post
    card.querySelector('.edit-post-btn').addEventListener('click', () => {
      const currentText = card.querySelector('.post-content').textContent;
      const newText = prompt('Edit your post content:', currentText);
      if (newText !== null && newText.trim() !== '') {
        apiCall(`/posts/${post._id}`, 'PUT', { content: newText }).then(res => {
          if (res && res.success) {
            showToast('Post updated!', 'success');
            card.querySelector('.post-content').textContent = res.data.content;
          }
        });
      }
    });

    // Bind Delete Post
    card.querySelector('.delete-post-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this post?')) {
        apiCall(`/posts/${post._id}`, 'DELETE').then(res => {
          if (res && res.success) {
            showToast('Post deleted successfully', 'success');
            card.remove();
          }
        });
      }
    });
  }

  // Bind Like Button
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true;
    const res = await apiCall(`/posts/${post._id}/like`, 'POST');
    if (res && res.success) {
      const heartIcon = likeBtn.querySelector('i');
      if (res.isLiked) {
        likeBtn.classList.add('liked');
        heartIcon.className = 'fa-solid fa-heart';
      } else {
        likeBtn.classList.remove('liked');
        heartIcon.className = 'fa-regular fa-heart';
      }
      card.querySelector('.likes-count-val').textContent = res.likesCount;
      
      // Update likes list cache inside the post object locally
      post.likes = res.likes;
    }
    likeBtn.disabled = false;
  });

  // Bind Likes list trigger popup
  card.querySelector('.count-likes-trigger').addEventListener('click', () => {
    // Post likes can be populated array. Let's retrieve list from our post object
    openUsersModal(post.likes, 'Liked By');
  });

  // Bind Comments Drawer toggle
  const commSection = card.querySelector(`#comments-section-${post._id}`);
  const commList = card.querySelector(`#comments-list-${post._id}`);
  const commToggleBtn = card.querySelector('.comments-btn-toggle');
  
  const toggleCommentsDrawer = async () => {
    const isHidden = commSection.classList.contains('hidden');
    commSection.classList.toggle('hidden');

    if (isHidden) {
      // Load Comments from API
      commList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center;">Loading comments...</p>`;
      const res = await apiCall(`/comments/${post._id}`, 'GET');
      commList.innerHTML = '';
      
      if (res && res.success) {
        const comments = res.data;
        if (comments.length === 0) {
          commList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding: 0.5rem 0;">No comments yet. Be the first to reply!</p>`;
        } else {
          comments.forEach(c => {
            commList.appendChild(buildCommentNode(c, post));
          });
        }
      }
    }
  };

  commToggleBtn.addEventListener('click', toggleCommentsDrawer);
  card.querySelector('.count-comments-trigger').addEventListener('click', toggleCommentsDrawer);

  // Bind comment form submission
  const commentForm = card.querySelector(`#comment-form-${post._id}`);
  const commentInput = card.querySelector(`#comment-input-field-${post._id}`);
  
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return;

    commentInput.disabled = true;
    const res = await apiCall(`/comments/${post._id}`, 'POST', { commentText: text });
    commentInput.disabled = false;

    if (res && res.success) {
      commentInput.value = '';
      
      // Remove "no comments" message if present
      const emptyMsg = commList.querySelector('p');
      if (emptyMsg && emptyMsg.textContent.includes('No comments yet')) {
        emptyMsg.remove();
      }

      commList.appendChild(buildCommentNode(res.data, post));
      
      // Update comment counter
      const counter = card.querySelector('.comments-count-val');
      counter.textContent = parseInt(counter.textContent) + 1;
    }
  });

  return card;
}

// Build comments node layout
function buildCommentNode(comment, post) {
  const node = document.createElement('div');
  node.className = 'comment-card';
  node.id = `comment-${comment._id}`;

  const isOwnComment = state.user && comment.userId._id === state.user._id;
  const isPostOwner = state.user && post.userId._id === state.user._id;

  const avatar = comment.userId.profilePicture
    ? `<img src="${comment.userId.profilePicture}" alt="${comment.userId.username}" class="avatar-sm">`
    : `<img src="" alt="${comment.userId.username}" class="avatar-sm fallback-avatar">`;

  // Delete button if comment owner OR post owner
  let delBtn = '';
  if (isOwnComment || isPostOwner) {
    delBtn = `<button class="delete-comment-btn" title="Delete Comment"><i class="fa-solid fa-trash-can"></i></button>`;
  }

  node.innerHTML = `
    <a href="#/profile/${comment.userId.username}">${avatar}</a>
    <div class="comment-details">
      <div style="display: flex; justify-content: space-between;">
        <a href="#/profile/${comment.userId.username}" class="comment-author-name">@${comment.userId.username}</a>
        ${delBtn}
      </div>
      <p class="comment-text">${comment.commentText}</p>
      <span class="comment-time">${formatRelativeTime(comment.createdAt)}</span>
    </div>
  `;

  if (isOwnComment || isPostOwner) {
    node.querySelector('.delete-comment-btn').addEventListener('click', async () => {
      if (confirm('Delete this comment?')) {
        const res = await apiCall(`/comments/${comment._id}`, 'DELETE');
        if (res && res.success) {
          showToast('Comment deleted', 'success');
          node.remove();
          // Decrement count UI
          const card = document.getElementById(`post-card-${post._id}`);
          if (card) {
            const counter = card.querySelector('.comments-count-val');
            counter.textContent = Math.max(0, parseInt(counter.textContent) - 1);
          }
        }
      }
    });
  }

  return node;
}

// -------------------------------------------------------------
// AUTH PAGES: LOGIN & REGISTER FORMS
// -------------------------------------------------------------
function renderLoginPage() {
  const content = document.getElementById('guest-content');
  content.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <h1>ConnectHub</h1>
        <p>Login to connect with the world</p>
      </div>
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label for="login-email">Username or Email</label>
          <input type="text" id="login-email" placeholder="Enter username or email" required>
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary btn-auth-submit">Log In</button>
      </form>
      <div class="auth-footer">
        Don't have an account? <a href="#/register">Register</a>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailOrUsername = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const res = await apiCall('/auth/login', 'POST', { emailOrUsername, password });
    if (res && res.success) {
      showToast(`Welcome back, @${res.data.username}!`, 'success');
      saveSession(res.data.token, res.data);
      window.location.hash = '#/';
    }
  });
}

function renderRegisterPage() {
  const content = document.getElementById('guest-content');
  content.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <h1>ConnectHub</h1>
        <p>Create your new account</p>
      </div>
      <form id="register-form" class="auth-form">
        <div class="form-group">
          <label for="reg-username">Username</label>
          <input type="text" id="reg-username" placeholder="Username (letters/numbers/underscores)" required minlength="3" maxlength="30" pattern="^[a-zA-Z0-9_]+$">
        </div>
        <div class="form-group">
          <label for="reg-email">Email Address</label>
          <input type="email" id="reg-email" placeholder="yourname@domain.com" required>
        </div>
        <div class="form-group">
          <label for="reg-password">Password</label>
          <input type="password" id="reg-password" placeholder="Min. 6 characters" required minlength="6">
        </div>
        <button type="submit" class="btn btn-primary btn-auth-submit">Create Account</button>
      </form>
      <div class="auth-footer">
        Already have an account? <a href="#/login">Login</a>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    const res = await apiCall('/auth/register', 'POST', { username, email, password });
    if (res && res.success) {
      showToast('Registration successful!', 'success');
      saveSession(res.data.token, res.data);
      window.location.hash = '#/';
    }
  });
}

// -------------------------------------------------------------
// OVERLAYS & MODALS LOGIC BINDINGS
// -------------------------------------------------------------
function setupGlobalDOMListeners() {
  // Modal toggle definitions
  const createPostModal = document.getElementById('create-post-modal');
  const editProfileModal = document.getElementById('edit-profile-modal');
  const likesModal = document.getElementById('likes-modal');

  // Trigger create modal buttons
  document.querySelectorAll('.btn-create-trigger').forEach(btn => {
    btn.addEventListener('click', openCreatePostModal);
  });

  // Logout triggers
  const sidebarLogout = document.getElementById('sidebar-logout');
  if (sidebarLogout) {
    sidebarLogout.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }

  // Close modals listeners
  document.getElementById('close-create-post-btn').addEventListener('click', closeCreatePostModal);
  document.getElementById('cancel-create-post-btn').addEventListener('click', closeCreatePostModal);
  
  document.getElementById('close-edit-profile-btn').addEventListener('click', closeEditProfileModal);
  document.getElementById('cancel-edit-profile-btn').addEventListener('click', closeEditProfileModal);
  
  document.getElementById('close-likes-modal-btn').addEventListener('click', () => likesModal.classList.add('hidden'));

  // Close modals on clicking background overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });

  // Create Post Submit handler
  const postForm = document.getElementById('create-post-form');
  const imageInput = document.getElementById('post-image-input');
  const imgPreviewBox = document.getElementById('post-image-preview-box');
  const imgPreview = document.getElementById('post-image-preview');
  const textInput = document.getElementById('post-content-input');
  const removeImgBtn = document.getElementById('remove-post-image-btn');

  // Image preview callback
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imgPreview.src = e.target.result;
        imgPreviewBox.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove previewed photo trigger
  removeImgBtn.addEventListener('click', () => {
    imageInput.value = '';
    imgPreview.src = '';
    imgPreviewBox.classList.add('hidden');
  });

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contentText = textInput.value.trim();
    const file = imageInput.files[0];

    if (!contentText && !file) {
      showToast('Please add some text content or select an image', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('content', contentText);
    if (file) {
      formData.append('postImage', file);
    }

    const submitBtn = document.getElementById('submit-post-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const res = await apiCall('/posts', 'POST', formData, true);
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post';

    if (res && res.success) {
      showToast('Post shared successfully!', 'success');
      closeCreatePostModal();
      
      // Reset inputs
      textInput.value = '';
      imageInput.value = '';
      imgPreview.src = '';
      imgPreviewBox.classList.add('hidden');

      // Reload route to update list immediately if in Feed Page
      if (window.location.hash === '#/') {
        renderFeedPage();
      } else {
        window.location.hash = '#/';
      }
    }
  });

  // Profile Edit Submit handler
  const profileForm = document.getElementById('edit-profile-form');
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('edit-avatar-preview');

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    if (!file) return;

    // Show temporary preview
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.src = e.target.result;
      avatarPreview.classList.remove('fallback-avatar');
    };
    reader.readAsDataURL(file);

    // Upload immediately in background
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    showToast('Uploading profile picture...', 'info');
    const uploadRes = await apiCall('/users/profile/picture', 'POST', formData, true);
    
    if (uploadRes && uploadRes.success) {
      showToast(uploadRes.message, 'success');
      // Update local cache
      state.user.profilePicture = uploadRes.profilePicture;
      localStorage.setItem('ch_user', JSON.stringify(state.user));
      updateNavProfileData();
    }
  });

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bio = document.getElementById('edit-bio').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    const website = document.getElementById('edit-website').value.trim();

    const submitBtn = document.getElementById('submit-profile-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const res = await apiCall('/users/profile', 'PUT', { bio, location, website });
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';

    if (res && res.success) {
      showToast(res.message, 'success');
      closeEditProfileModal();
      
      // Update local storage user profile text
      state.user.bio = res.data.bio;
      state.user.location = res.data.location;
      state.user.website = res.data.website;
      localStorage.setItem('ch_user', JSON.stringify(state.user));
      
      // Reload profile view
      renderProfilePage(state.user.username);
    }
  });

  // Global Search Form Handler
  const searchForm = document.getElementById('global-search-form');
  const searchInput = document.getElementById('search-input');
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = searchInput.value.trim();
    if (!val) return;
    searchInput.value = '';
    window.location.hash = `#/search/${encodeURIComponent(val)}`;
  });
}

function openCreatePostModal() {
  document.getElementById('create-post-modal').classList.remove('hidden');
  document.getElementById('post-content-input').focus();
}

function closeCreatePostModal() {
  document.getElementById('create-post-modal').classList.add('hidden');
}

function openEditProfileModal() {
  document.getElementById('edit-profile-modal').classList.remove('hidden');
}

function closeEditProfileModal() {
  document.getElementById('edit-profile-modal').classList.add('hidden');
}

// -------------------------------------------------------------
// NOTIFICATIONS POLLER (Simulates live feeds)
// -------------------------------------------------------------
let notificationsPollerId = null;

function startNotificationsPolling() {
  // Sync immediately
  fetchUnreadNotificationsCount();
  
  // Setup interval check every 25 seconds
  notificationsPollerId = setInterval(() => {
    fetchUnreadNotificationsCount();
  }, 25000);
}

function stopNotificationsPolling() {
  if (notificationsPollerId) {
    clearInterval(notificationsPollerId);
    notificationsPollerId = null;
  }
}

async function fetchUnreadNotificationsCount() {
  if (!state.token) return;
  const res = await apiCall('/notifications/unread-count', 'GET');
  if (res && res.success) {
    state.unreadCount = res.unreadCount;
    updateNotificationBadges();
  }
}

function updateNotificationBadges() {
  const desktopBadge = document.getElementById('nav-notification-badge');
  const mobileBadge = document.getElementById('mobile-notification-badge');

  if (state.unreadCount > 0) {
    if (desktopBadge) {
      desktopBadge.textContent = state.unreadCount;
      desktopBadge.classList.remove('hidden');
    }
    if (mobileBadge) {
      mobileBadge.textContent = state.unreadCount;
      mobileBadge.classList.remove('hidden');
    }
  } else {
    if (desktopBadge) desktopBadge.classList.add('hidden');
    if (mobileBadge) mobileBadge.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// LOADING SKELETON GENERATORS
// -------------------------------------------------------------
function getLoadingSkeletons(count = 2) {
  let skeletonsHtml = '';
  for (let i = 0; i < count; i++) {
    skeletonsHtml += `
      <div class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton skeleton-avatar"></div>
          <div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text" style="width: 80px; height: 10px;"></div>
          </div>
        </div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `;
  }
  return skeletonsHtml;
}
