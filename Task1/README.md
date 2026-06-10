# E-Shop | Full-Stack E-Commerce Web Application

A modern, responsive, full-stack E-Commerce platform built using a Node.js + Express.js backend, MongoDB (Mongoose) database, and a glassmorphism-themed frontend using vanilla HTML5, CSS3, and JavaScript.

---

## Tech Stack

*   **Frontend**: HTML5, CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla JavaScript.
*   **Backend**: Node.js, Express.js (REST API architecture).
*   **Database**: MongoDB, Mongoose ODM.
*   **Security**: JWT (JSON Web Tokens) Authentication, Bcryptjs Password Hashing.

---

## Folder Structure

```
c:\Users\adepu\OneDrive\Desktop\Task1 code Alpha\
├── package.json               # Dependencies and launch scripts
├── server.js                  # Entry point for the Express server
├── seed.js                    # Script to pre-populate database & admin
├── .env                       # Environment configurations (ignored in git)
├── .env.example               # Reference template for environment config
├── config/
│   └── db.js                  # MongoDB Mongoose connection config
├── middleware/
│   ├── auth.js                # JWT verification & admin route guards
│   └── errorHandler.js        # Central JSON error handling parser
├── models/
│   ├── User.js                # User collection model schema (hashing pre-save)
│   ├── Product.js             # Catalog model schema (with nested review subdocuments)
│   ├── Cart.js                # Database persistent cart schema
│   └── Order.js               # Order snapshot history schema
├── routes/
│   ├── auth.js                # Authentication endpoints
│   ├── products.js            # Catalog search/filtering & CRUD endpoints
│   ├── cart.js                # User shopping cart endpoints
│   └── orders.js              # Checkout and fulfillment tracking endpoints
└── public/                    # Frontend client code
    ├── index.html             # Homepage (Hero, Featured Products)
    ├── login.html             # Customer Account Login
    ├── register.html          # Customer Account Registration
    ├── shop.html              # Product Catalogue (Sidebar Filters & Sorting)
    ├── product.html           # Product Details Page (Review Forms & Tabs)
    ├── cart.html              # Shopping Cart View (Coupon applicator)
    ├── checkout.html          # Invoice Checkout (COD / Card toggles)
    ├── profile.html           # Customer Dashboard (Settings & Ship tracking)
    ├── admin.html             # Admin Console (Sales Stats & inventory CRUD)
    ├── order-confirmation.html # Checkout success receipt page
    ├── css/
    │   └── styles.css         # Glassmorphic, light/dark responsive CSS stylesheet
    └── js/
        ├── api.js             # Async wrapper incorporating JWT authorization header
        ├── main.js            # Global scripts (dark mode, search suggestions, card generator)
        ├── auth.js            # Sign in and Sign up form submission handlers
        ├── shop.js            # Catalog search, filter bindings, and pagination navigation
        ├── product.js         # Detail rendering, gallery actions, and review form
        ├── cart.js            # Cart calculations, increments, and coupon codes
        ├── checkout.js        # Checkout prefills, billing modes, and order creation
        ├── profile.js         # Settings updates, order records, and progress trackers
        └── admin.js           # Admin stats summaries, item CRUD modals, and status updates
```

---

## Installation & Local Execution Guide

### Prerequisites
1.  **Node.js**: Install Node.js (v16.0 or higher recommended). [Download Page](https://nodejs.org/).
2.  **MongoDB**: Ensure MongoDB is running locally on your machine at `mongodb://127.0.0.1:27017/` (e.g. via MongoDB Community Server or MongoDB compass), or set up a MongoDB Atlas URI.

### Step-by-Step Installation

1.  **Extract / Clone the repository** into your local directory.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**:
    Create a file named `.env` in the root directory and copy the contents from `.env.example`:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://127.0.0.1:27017/eshop
    JWT_SECRET=your_super_secure_jwt_secret_key
    ```
4.  **Seed the Database**:
    Initialize the database with 12 structured products, a default customer, and an admin account:
    ```bash
    npm run seed
    ```
    *   **Default Customer**: `john@example.com` / `user123`
    *   **Default Admin**: `admin@eshop.com` / `admin123`
5.  **Start the Server**:
    *   **For Development (Auto-Reloading via Nodemon)**:
        ```bash
        npm run dev
        ```
    *   **For Production**:
        ```bash
        npm start
        ```
6.  **Open the Web Application**:
    Navigate to `http://localhost:5000` in your web browser.

---

## API Documentation

### 1. Authentication (`/api/auth`)
*   `POST /api/auth/register` - Create user profile. Returns token + user JSON payload.
*   `POST /api/auth/login` - Authenticate login. Returns token + user JSON payload.
*   `GET /api/auth/profile` - Protected: Get current user details.
*   `PUT /api/auth/profile` - Protected: Update user details or change password.
*   `GET /api/auth/users` - Protected/Admin: List all users on platform.

### 2. Product Catalog (`/api/products`)
*   `GET /api/products` - Public: List products.
    *   *Query Params*: `page` (default 1), `limit` (default 9), `search` (regex text), `category` (exact string), `minPrice`, `maxPrice`, `sort` (`newest`, `priceAsc`, `priceDesc`, `ratingDesc`).
*   `GET /api/products/:id` - Public: Fetch detail of single product by ID.
*   `POST /api/products/:id/reviews` - Protected: Add user rating (1-5) and comment review.
*   `POST /api/products` - Protected/Admin: Add new product to database.
*   `PUT /api/products/:id` - Protected/Admin: Edit product details.
*   `DELETE /api/products/:id` - Protected/Admin: Remove product from database.

### 3. Shopping Cart (`/api/cart`)
*   `GET /api/cart` - Protected: Retrieve persistent cart for authenticated user.
*   `POST /api/cart/add` - Protected: Add product item to cart. `{ productId, quantity }`
*   `PUT /api/cart/update` - Protected: Adjust quantity of item. `{ productId, quantity }`
*   `DELETE /api/cart/remove` - Protected: Delete item from cart. `{ productId }`

### 4. Order Management (`/api/orders`)
*   `POST /api/orders/create` - Protected: Check out active cart, deduct stock inventory, clear cart. `{ shippingAddress: { name, phone, street, city, state, zipCode, country }, paymentMethod }`
*   `GET /api/orders/user` - Protected: Fetch order records of logged in user.
*   `GET /api/orders/:id` - Protected: Fetch detailed information and status tracking for a single order.
*   `GET /api/orders` - Protected/Admin: List all orders in the store.
*   `PUT /api/orders/:id/status` - Protected/Admin: Change order status. `{ status }` (Values: `Pending`, `Processing`, `Shipped`, `Delivered`).

---

## Deployment Guide

### 1. Database Deployment: MongoDB Atlas
1.  Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a Free Shared Cluster.
3.  Under **Database Access**, create a user account with read/write credentials.
4.  Under **Network Access**, whitelist connection IP addresses (use `0.0.0.0/0` for hosting access).
5.  Go to Clusters > click **Connect** > Choose **Connect your application**.
6.  Copy the connection string (it looks like `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/eshop?retryWrites=true&w=majority`).
7.  Replace your local `.env` `MONGODB_URI` value with this cluster string.

### 2. Backend Server Deployment: Render
1.  Create an account at [Render](https://render.com/).
2.  Click **New +** > select **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the build details:
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  Under **Advanced**, click **Add Environment Variable** and define:
    *   `MONGODB_URI` = *Your MongoDB Atlas cluster URI*
    *   `JWT_SECRET` = *Your secret key string*
    *   `PORT` = `10000` (Render's default port binding)
6.  Click **Deploy Web Service**. Render will install packages and serve the unified application.

### 3. Frontend Deployment: Vercel
Because the Express backend serves the frontend as static files from the `/public` directory, hosting the entire unified app on **Render** (as a Web Service) serves both API and Webpages out of the box.

If you specifically wish to deploy the frontend files separately to Vercel:
1.  Deploy the backend API server first (e.g. to Render at `https://eshop-api.onrender.com`).
2.  Open `public/js/api.js` and change the `BASE_URL` value:
    ```javascript
    BASE_URL: 'https://eshop-api.onrender.com/api'
    ```
3.  Sign in to [Vercel](https://vercel.com/) and click **Add New Project** > connect your Git repository.
4.  Select the root folder or set the **Root Directory** option specifically to `public`.
5.  Click **Deploy**. Vercel will host your HTML, CSS, and JS files on a global CDN and query the APIs from the Render backend.
