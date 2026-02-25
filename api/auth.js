const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

// /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'गलत पासवर्ड या ईमेल!' 
    });
  }
  
  try {
    const user = await DatabaseService.findUserByEmail(email);
    
    // User must exist - no auto registration for security
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'गलत पासवर्ड या ईमेल!' 
      });
    }

    // Verify password (for development, comparing plain text)
    // In production, use bcrypt.compare()
    if (user.password !== password) {
      return res.status(401).json({ 
        success: false,
        error: 'गलत पासवर्ड या ईमेल!' 
      });
    }

    const sessionToken = `kronop_session_${user._id}_${Date.now()}`;

    res.json({
      success: true,
      token: sessionToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'गलत पासवर्ड या ईमेल!' 
    });
  }
});

// /api/auth/google-login
router.post('/google-login', async (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: 'UID and Email are required' });
  }

  try {

    let user = await DatabaseService.findUserByEmail(email);

    // Create or Update User
    if (!user) {
      // Create new user
      user = await DatabaseService.createUser({
        email: email,
        username: displayName || `user_${uid.substring(0, 6)}`,
        name: displayName,
        avatar: photoURL,
        createdAt: new Date()
      });
    } else {
      // Update existing user with latest Google info
      const updates = {};
      if (displayName && !user.name) updates.name = displayName;
      if (photoURL && !user.avatar) updates.avatar = photoURL;
      
      if (Object.keys(updates).length > 0) {
        user = await DatabaseService.updateUser(user._id, updates);
      }
    }

    const sessionToken = `kronop_google_${user._id}_${Date.now()}`;

    res.json({
      success: true,
      token: sessionToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
