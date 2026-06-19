const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Follower = require('./models/Follower');
const Notification = require('./models/Notification');

dotenv.config();

const seedData = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/connecthub');
    console.log('MongoDB Connected for Seeding...');

    // Clear existing data
    await User.deleteMany();
    await Post.deleteMany();
    await Comment.deleteMany();
    await Follower.deleteMany();
    await Notification.deleteMany();
    console.log('Database cleared!');

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Create 3 Users
    const users = await User.create([
      {
        username: 'alex_dev',
        email: 'alex@connecthub.com',
        password: 'password123', // hooks will trigger encrypt on pre-save, but since we use User.create with raw string it runs hooks.
        bio: 'Full Stack Engineer | Passionate about premium Web designs & AI.',
        location: 'San Francisco, CA',
        website: 'https://alexdev.io'
      },
      {
        username: 'sophia_art',
        email: 'sophia@connecthub.com',
        password: 'password123',
        bio: 'Digital Illustrator. Lover of gradients and light structures.',
        location: 'London, UK',
        website: 'https://sophiaart.portfolio'
      },
      {
        username: 'marcus_fit',
        email: 'marcus@connecthub.com',
        password: 'password123',
        bio: 'Personal Trainer & Wellness Coach. Move every day!',
        location: 'Austin, TX',
        website: 'https://marcusfitness.fit'
      }
    ]);

    const [alex, sophia, marcus] = users;
    console.log('Mock Users created!');

    // Establish Follower connections
    // Alex follows Sophia and Marcus
    // Sophia follows Alex
    // Marcus follows Alex
    await Follower.create([
      { followerId: alex._id, followingId: sophia._id },
      { followerId: alex._id, followingId: marcus._id },
      { followerId: sophia._id, followingId: alex._id },
      { followerId: marcus._id, followingId: alex._id }
    ]);

    // Update User documents following/followers list
    alex.following.push(sophia._id, marcus._id);
    alex.followers.push(sophia._id, marcus._id);
    
    sophia.following.push(alex._id);
    sophia.followers.push(alex._id);

    marcus.following.push(alex._id);
    marcus.followers.push(alex._id);

    await alex.save();
    await sophia.save();
    await marcus.save();
    console.log('Follow connections established!');

    // Create Posts
    const posts = await Post.create([
      {
        userId: alex._id,
        content: 'Excited to announce that ConnectHub is now live! Built with Node.js, Express, MongoDB, and modern glassmorphic styles. Give it a like and tell me what you think in the comments!',
        likes: [sophia._id, marcus._id]
      },
      {
        userId: sophia._id,
        content: 'Working on a new series of glassmorphism design layouts. Here is a sneak peek! Dark mode feels so clean. 🎨✨',
        likes: [alex._id]
      },
      {
        userId: marcus._id,
        content: 'Consistency beats intensity. Set your schedule, start small, and build momentum. Ready to smash the weekend goals! 💪🏃‍♂️',
        likes: []
      }
    ]);

    const [alexPost, sophiaPost, marcusPost] = posts;
    console.log('Mock Posts created!');

    // Add comments
    await Comment.create([
      {
        postId: alexPost._id,
        userId: sophia._id,
        commentText: 'This UI is absolutely breathtaking! The glassmorphism elements are clean.'
      },
      {
        postId: alexPost._id,
        userId: marcus._id,
        commentText: 'Congrats on the launch Alex! Looks solid.'
      },
      {
        postId: sophiaPost._id,
        userId: alex._id,
        commentText: 'Stunning choice of colors Sophia. Can\\'t wait to see the final layout!'
      }
    ]);

    // Update comments count on posts
    alexPost.commentsCount = 2;
    sophiaPost.commentsCount = 1;
    await alexPost.save();
    await sophiaPost.save();
    console.log('Mock Comments posted!');

    // Create Notifications
    await Notification.create([
      {
        receiverId: alex._id,
        senderId: sophia._id,
        type: 'like',
        postId: alexPost._id,
        isRead: false
      },
      {
        receiverId: alex._id,
        senderId: sophia._id,
        type: 'comment',
        postId: alexPost._id,
        isRead: false
      },
      {
        receiverId: alex._id,
        senderId: marcus._id,
        type: 'follow',
        isRead: true
      }
    ]);
    console.log('Mock Notifications triggered!');

    console.log('Database seeding finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
