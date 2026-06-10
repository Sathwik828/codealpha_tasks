require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');

const seedDB = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eshop');
    console.log('MongoDB Connected for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing database collections.');

    // Seed Users
    // 1. Admin
    const adminUser = new User({
      name: "E-Shop Admin",
      email: "admin@eshop.com",
      password: "admin123",
      phone: "+15551234567",
      address: {
        street: "100 Admin Plaza",
        city: "Tech City",
        state: "CA",
        zipCode: "94016",
        country: "USA"
      },
      role: "admin"
    });
    const savedAdmin = await adminUser.save();
    console.log('Seeded Admin account successfully: email = admin@eshop.com, password = admin123');

    // 2. Regular customer
    const demoUser = new User({
      name: "John Doe",
      email: "john@example.com",
      password: "user123",
      phone: "+15557654321",
      address: {
        street: "742 Evergreen Terrace",
        city: "Springfield",
        state: "IL",
        zipCode: "62704",
        country: "USA"
      },
      role: "user"
    });
    const savedUser = await demoUser.save();
    console.log('Seeded Customer account successfully: email = john@example.com, password = user123');

    // Products Data linked to seeded user IDs
    const productsData = [
      {
        title: "iPhone 14 Pro Max (Space Black)",
        description: "The ultimate smartphone experience. Featuring a 48MP camera, Dynamic Island display technology, A16 Bionic processing chip, and an all-day battery life.",
        category: "Electronics",
        price: 1099.99,
        stock: 15,
        images: [
          "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600",
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600"
        ],
        rating: 4.8,
        reviews: [
          {
            userId: savedAdmin._id,
            userName: savedAdmin.name,
            rating: 5,
            comment: "Absolutely stunning display. Best iPhone upgrade in years!"
          },
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 4,
            comment: "Battery life is solid, but the phone is a bit heavy."
          }
        ]
      },
      {
        title: "Premium Wireless Active Noise-Cancelling Headphones",
        description: "Immerse yourself in rich, high-fidelity sound. Features active hybrid noise cancellation, 40-hour wireless playtime, and memory-foam ear cushions.",
        category: "Electronics",
        price: 249.99,
        stock: 25,
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
          "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600"
        ],
        rating: 4.6,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 5,
            comment: "Noise cancellation is top-tier. Extremely comfortable for long flights!"
          }
        ]
      },
      {
        title: "Minimalist Smart Watch Series 8",
        description: "Monitor your health, track your workouts, and stay connected on the go. Swim-proof design with blood oxygen sensor and seamless smartphone integration.",
        category: "Electronics",
        price: 329.99,
        stock: 20,
        images: [
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
          "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600"
        ],
        rating: 4.5,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 4,
            comment: "Great fitness tracking features. The heart rate sensor is highly accurate."
          }
        ]
      },
      {
        title: "Mechanical Retro Keyboard",
        description: "Elevate your typing experience. Features tactile clicky blue switches, programmable RGB backlit modes, and vintage-style circular keys.",
        category: "Electronics",
        price: 89.99,
        stock: 30,
        images: [
          "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600",
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600"
        ],
        rating: 4.7,
        reviews: [
          {
            userId: savedAdmin._id,
            userName: savedAdmin.name,
            rating: 5,
            comment: "Clicks are so satisfying! Makes coding and writing emails fun again."
          }
        ]
      },
      {
        title: "Classic Leather Backpack",
        description: "Handcrafted from full-grain genuine leather. Equipped with a padded 15-inch laptop sleeve, water-resistant interior lining, and heavy-duty brass zippers.",
        category: "Fashion",
        price: 129.99,
        stock: 10,
        images: [
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"
        ],
        rating: 4.9,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 5,
            comment: "Excellent leather smell and craftsmanship. Fits all my work essentials."
          }
        ]
      },
      {
        title: "Air-Flow Sport Running Shoes",
        description: "Engineered with breathable mesh fabric, impact-absorbing foam soles, and non-slip rubber outsoles. Ideal for jogging, training, and casual wear.",
        category: "Fashion",
        price: 79.99,
        stock: 45,
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
          "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600"
        ],
        rating: 4.4,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 4,
            comment: "Fits true to size and very lightweight. Good value for money."
          }
        ]
      },
      {
        title: "Vintage Denim Jacket",
        description: "Timeless trucker-style denim jacket. Made from heavy-washed premium cotton with a button-up front, twin chest pockets, and comfortable side-welt pockets.",
        category: "Fashion",
        price: 64.99,
        stock: 18,
        images: [
          "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600",
          "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=600"
        ],
        rating: 4.3,
        reviews: []
      },
      {
        title: "Ergonomic Modern Accent Chair",
        description: "Bring luxury comfort to your living room or home office. Features a contoured fabric seat, high-density padding, and sturdy solid ash-wood legs.",
        category: "Home Decor",
        price: 189.99,
        stock: 8,
        images: [
          "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600",
          "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600"
        ],
        rating: 4.7,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 5,
            comment: "Extremely chic and comfortable. Easy to assemble as well!"
          }
        ]
      },
      {
        title: "Sleek Minimalist Desk Lamp",
        description: "Add clean lighting to your workspace. Includes touch-sensitive controls, 3 dimmable temperature modes, and a built-in USB charging port for your phone.",
        category: "Home Decor",
        price: 45.00,
        stock: 22,
        images: [
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
          "https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?w=600"
        ],
        rating: 4.5,
        reviews: []
      },
      {
        title: "Double-Walled Ceramic Coffee Mug",
        description: "Keep your brew hot and your hands cool. Made of durable ceramic with a wood-grain handle and a spill-resistant slide lid. 12oz capacity.",
        category: "Home Decor",
        price: 18.50,
        stock: 50,
        images: [
          "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600",
          "https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=600"
        ],
        rating: 4.2,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 4,
            comment: "Holds temperature nicely. The ceramic feel is premium."
          }
        ]
      },
      {
        title: "Pro Grip Non-Slip Yoga Mat",
        description: "6mm thick high-density TPE cushioning mat. Offers outstanding grip, joint support, and moisture resistance. Complete with a shoulder carry strap.",
        category: "Sports",
        price: 34.99,
        stock: 40,
        images: [
          "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600"
        ],
        rating: 4.6,
        reviews: [
          {
            userId: savedUser._id,
            userName: savedUser.name,
            rating: 5,
            comment: "Does not slip even during hot yoga. Very cushiony!"
          }
        ]
      },
      {
        title: "Matte Stainless Steel Water Bottle",
        description: "Vacuum insulated water bottle that keeps drinks ice cold for 24 hours or hot for 12 hours. Leak-proof straw lid, 32oz capacity, BPA-free.",
        category: "Sports",
        price: 24.99,
        stock: 35,
        images: [
          "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"
        ],
        rating: 4.5,
        reviews: []
      }
    ];

    // Seed Products
    const createdProducts = await Product.insertMany(productsData);
    console.log(`Seeded ${createdProducts.length} products successfully.`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database seeding completed. Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
