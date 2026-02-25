const express = require('express');
const router = express.Router();
const ProfileService = require('../services/profileService');
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for local uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      if (!fs.existsSync(uploadDir)){
          fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`Warning: Could not create directory ${uploadDir}:`, error.message);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ========================================================================
// IMPORTANT: ROUTE ORDERING - SPECIFIC ROUTES MUST COME BEFORE GENERIC ONES
// ========================================================================

// 1. SPECIFIC ROUTES (Must come first)
// ========================================================================

// Search users endpoint - MUST come before /:id route
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, skip = 0 } = req.query;
    
    console.log(`🔍 Search request received: q="${q}", limit=${limit}, skip=${skip}`);
    
    if (!q || q.trim() === '') {
      console.log('❌ Empty search query, returning empty results');
      return res.json({ success: true, data: [] });
    }

    const User = require('../models/User');
    const query = q.trim();
    
    console.log(`🔍 Processing search query: "${query}"`);
    
    // Enhanced search logic - search by username, displayName, or bio
    // Using $regex for partial matching with case-insensitive search
    const searchRegex = new RegExp(query, 'i');
    
    console.log(`🔍 Searching with regex: ${searchRegex}`);
    
    let users = [];
    try {
      // Check if User model exists
      const User = require('../models/User');
      if (!User) {
        console.error('❌ User model not found');
        return res.json({ 
          success: true, 
          data: [],
          message: 'Search temporarily unavailable'
        });
      }

      users = await User.find({
        $or: [
          { username: { $regex: searchRegex } },
          { displayName: { $regex: searchRegex } },
          { bio: { $regex: searchRegex } }
        ]
      })
      .select('username displayName avatar bio supporters supporting createdAt')
      .populate('supporters', 'username displayName avatar')
      .populate('supporting', 'username displayName avatar')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });
      
      console.log(`✅ MongoDB query executed successfully`);
    } catch (dbError) {
      console.error('💥 MongoDB Error:', dbError);
      console.error('🔍 DB Error details:', {
        message: dbError.message,
        stack: dbError.stack
      });
      
      // Return empty array with success message instead of error
      return res.json({ 
        success: true, 
        data: [],
        message: 'No results found'
      });
    }

    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id.toString(), // Convert ObjectId to string
      username: user.username || `user_${user._id}`,
      displayName: user.displayName || 'Unknown User',
      avatar: user.avatar || `https://picsum.photos/100/100?random=${user._id}`,
      bio: user.bio || '',
      supporters: user.supporters ? user.supporters.length : 0,
      supporting: user.supporting ? user.supporting.length : 0,
      posts: 0, // Will be calculated later from content collection
      isSupporting: false // Will be determined based on current user
    }));

    console.log(`✅ Search for "${query}": Found ${formattedUsers.length} users`);
    console.log(`📋 Search results:`, formattedUsers.map(u => ({ id: u.id, username: u.username })));
    
    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('💥 Search Users Error:', error);
    console.error('🔍 Error stack:', error.stack);
    
    // Return empty array with success message instead of error
    res.json({ 
      success: true, 
      data: [],
      message: 'No results found'
    });
  }
});

// Support/Unsupport user endpoint - MUST come before /:id route
router.post('/:id/support', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUserId } = req.body;
    
    console.log(`🤝 Support request received: targetId="${id}", currentUserId="${currentUserId}"`);
    
    // Validate ObjectId format for target user
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid target ObjectId format: "${id}"`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID format' 
      });
    }
    
    if (!currentUserId) {
      console.log(`❌ Missing currentUserId in request body`);
      return res.status(400).json({ 
        success: false, 
        error: 'Current user ID is required' 
      });
    }

    const User = require('../models/User');
    
    // Find both users
    let targetUser, currentUser;
    try {
      [targetUser, currentUser] = await Promise.all([
        User.findById(id),
        User.findById(currentUserId)
      ]);
      
      console.log(`✅ Users found: target=${!!targetUser}, current=${!!currentUser}`);
    } catch (dbError) {
      console.error('💥 Database Error:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database operation failed' 
      });
    }
    
    if (!targetUser || !currentUser) {
      console.log(`❌ User not found: target=${!!targetUser}, current=${!!currentUser}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if already supporting
    const isSupporting = targetUser.supporters.includes(currentUserId);
    
    console.log(`🤝 Support status: isSupporting=${isSupporting}`);
    
    if (isSupporting) {
      // Unsupport
      targetUser.supporters.pull(currentUserId);
      currentUser.supporting.pull(id);
      console.log(`➖ Unsupporting user: ${id}`);
    } else {
      // Support
      targetUser.supporters.push(currentUserId);
      currentUser.supporting.push(id);
      console.log(`➕ Supporting user: ${id}`);
    }

    try {
      await Promise.all([targetUser.save(), currentUser.save()]);
      console.log(`✅ Support operation completed successfully`);
      
      res.json({ 
        success: true, 
        data: {
          isSupporting: !isSupporting,
          supporters: targetUser.supporters.length
        }
      });
    } catch (saveError) {
      console.error('💥 Save Error:', saveError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save support data' 
      });
    }
  } catch (error) {
    console.error('💥 Support User Error:', error);
    console.error('🔍 Error stack:', error.stack);
    
    // Return proper JSON response instead of HTML error page
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// ========================================================================
// 2. GENERIC ROUTES (Must come after specific routes)
// ========================================================================

// Get user profile by ID - MUST come after /search route
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 Profile request received for ID: "${id}"`);
    
    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid ObjectId format: "${id}"`);
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }
    
    console.log(`✅ Valid ObjectId: "${id}"`);
    
    const data = await ProfileService.getProfile({ userId: id });
    
    if (data) {
      console.log(`✅ Profile found for user: "${id}"`);
    } else {
      console.log(`❌ Profile not found for user: "${id}"`);
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('💥 Get Profile Error:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user profile by ID
router.put('/:id', upload.any(), async (req, res) => {
  try {
    const payload = { ...req.body, id: req.params.id };
    
    // Handle file upload if present
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const protocol = req.protocol;
      const host = req.get('host');
      const imageUrl = `${protocol}://${host}/uploads/${file.filename}`;
      
      // Update avatar/profilePic fields
      payload.avatar = imageUrl;
      payload.profilePic = imageUrl;
    }

    const user = await ProfileService.updateProfile(payload);
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// ========================================================================
// 3. OTHER ROUTES
// ========================================================================

// Sync Supabase user with MongoDB
router.post('/sync', async (req, res) => {
  try {
    const result = await userController.syncSupabaseUser(req, res);
    return result;
  } catch (error) {
    console.error('Sync Supabase User Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile by query parameters
router.get('/profile', async (req, res) => {
  try {
    const { userId, phone } = req.query;
    if (!userId && !phone) {
       console.warn('[API] Missing userId or phone in /profile request');
    }
    
    const data = await ProfileService.getProfile({ userId, phone });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(200).json({ success: false, error: error.message, data: null });
  }
});

// Update profile by query parameters
router.put('/profile', upload.any(), async (req, res) => {
  try {
    
    // Check for userId in various places (body, query, or params)
    const userId = req.body.userId || req.body.id || req.query.userId || req.params.id;
    
    if (!userId) {
      console.error('[API] Update Profile Error: No user identifier provided');
      return res.status(400).json({ error: 'User ID is required for profile updates' });
    }

    const payload = { ...req.body, id: userId };
    
    // Map userId to id for ProfileService compatibility
    if (!payload.id) {
      payload.id = userId;
    }
    
    // Handle file upload if present in the update request
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // Take the first file
      const protocol = req.protocol;
      const host = req.get('host');
      const imageUrl = `${protocol}://${host}/uploads/${file.filename}`;
      
      // Update avatar/profilePic fields
      payload.avatar = imageUrl;
      payload.profilePic = imageUrl;
    }

    const user = await ProfileService.updateProfile(payload);
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// Handle profile image upload (supports both file upload and direct URL)
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {

    const userId = req.body.userId;
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      // Construct full URL so frontend can display it immediately
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image file or URL is required' });
    }

    const url = await ProfileService.uploadProfileImage(userId, imageUrl);
    res.json({ success: true, data: url });
  } catch (error) {
    console.error('Upload Image Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supporters endpoint (placeholder)
router.get('/supporters', async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supporting endpoint (placeholder)
router.get('/supporting', async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
