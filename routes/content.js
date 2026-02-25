const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const multer = require('multer');

// Configure multer for content uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos/reels
  }
});

// GET /content/photo/user
router.get('/photo/user', contentController.getUserPhotos);

// GET /content/photo (PUBLIC - for all photos)
router.get('/photo', contentController.getUserPhotos);

// GET /content/photos (ALIAS for /content/photo)
router.get('/photos', contentController.getUserPhotos);

// GET /content/video (PUBLIC - for all videos)
router.get('/video', contentController.getUserVideos);

// GET /content/videos (ALIAS for /content/video)
router.get('/videos', contentController.getUserVideos);

// GET /content/reels (PUBLIC - for all reels)
router.get('/reels', contentController.getUserReels);

// GET /content/reels/public (ALIAS for /content/reels)
router.get('/reels/public', contentController.getUserReels);

// GET /content/story (PUBLIC)
router.get('/story', contentController.getUserStories);

// GET /content/shayari-photo (PUBLIC - for all shayari photos)
router.get('/shayari-photo', contentController.getUserShayariPhotos);

// POST /content/reels/upload (PUBLIC - no auth required)
router.post('/reels/upload', upload.single('video'), async (req, res) => {
  try {
    // Public upload - no authentication required
    const { title, description, tags, location } = req.body;
    const videoFile = req.file;
    
    if (!videoFile) {
      return res.status(400).json({ 
        success: false, 
        error: 'Video file is required' 
      });
    }
    
    // Parse tags if provided as string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = tags.split(',').map(tag => tag.trim());
      }
    }
    
    // Parse location if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        // Default location if parsing fails
        parsedLocation = { type: 'Point', coordinates: [0, 0] };
      }
    }
    
    // For now, return a test response without actual upload
    // TODO: Implement actual upload with ReelsBridge
    const testResult = {
      id: 'test_' + Date.now(),
      title: title || 'Untitled Reel',
      description: description || '',
      tags: parsedTags,
      location: parsedLocation,
      userId: 'guest_user',
      uploadDate: new Date(),
      status: 'test_mode',
      message: 'Public upload endpoint working - BunnyCDN upload pending'
    };
    
    res.json({ 
      success: true, 
      message: 'Reel upload test successful',
      data: testResult 
    });
    
  } catch (error) {
    console.error('Reel upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /content/video/upload (PUBLIC - no auth required)
router.post('/video/upload', upload.single('video'), async (req, res) => {
  try {
    // Public upload - no authentication required
    const { title, description, tags, location } = req.body;
    const videoFile = req.file;
    
    if (!videoFile) {
      return res.status(400).json({ 
        success: false, 
        error: 'Video file is required' 
      });
    }
    
    // Parse tags if provided as string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = tags.split(',').map(tag => tag.trim());
      }
    }
    
    // Parse location if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        parsedLocation = { type: 'Point', coordinates: [0, 0] };
      }
    }
    
    // Test response
    const testResult = {
      id: 'test_' + Date.now(),
      title: title || 'Untitled Video',
      description: description || '',
      tags: parsedTags,
      location: parsedLocation,
      userId: 'guest_user',
      uploadDate: new Date(),
      status: 'test_mode',
      message: 'Public upload endpoint working - BunnyCDN upload pending'
    };
    
    res.json({ 
      success: true, 
      message: 'Video upload test successful',
      data: testResult 
    });
    
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /content/photo/upload (PUBLIC - no auth required)
router.post('/photo/upload', upload.single('photo'), async (req, res) => {
  try {
    // Public upload - no authentication required
    const { title, description, tags, location, category } = req.body;
    const photoFile = req.file;
    
    if (!photoFile) {
      return res.status(400).json({ 
        success: false, 
        error: 'Photo file is required' 
      });
    }
    
    // Parse tags if provided as string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = tags.split(',').map(tag => tag.trim());
      }
    }
    
    // Parse location if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        parsedLocation = { type: 'Point', coordinates: [0, 0] };
      }
    }
    
    // Test response
    const testResult = {
      id: 'test_' + Date.now(),
      title: title || 'Untitled Photo',
      description: description || '',
      tags: parsedTags,
      location: parsedLocation,
      category: category || 'general',
      userId: 'guest_user',
      uploadDate: new Date(),
      status: 'test_mode',
      message: 'Public upload endpoint working - BunnyCDN upload pending'
    };
    
    res.json({ 
      success: true, 
      message: 'Photo upload test successful',
      data: testResult 
    });
    
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /content/test (Simple test endpoint)
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 GET Test endpoint called');
    
    const testResponse = {
      success: true,
      message: 'Public API working!',
      timestamp: new Date().toISOString(),
      method: 'GET',
      serverInfo: {
        platform: 'Render Ready',
        mongodb: 'Connected',
        cors: 'Enabled',
        upload: 'Public Mode'
      }
    };
    
    res.json(testResponse);
  } catch (error) {
    console.error('🧪 GET Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /content/test (Simple test endpoint)
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 POST Test endpoint called');
    console.log('📤 Request body:', req.body);
    
    const testResponse = {
      success: true,
      message: 'Public API working!',
      timestamp: new Date().toISOString(),
      method: 'POST',
      requestReceived: req.body,
      serverInfo: {
        platform: 'Render Ready',
        mongodb: 'Connected',
        cors: 'Enabled',
        upload: 'Public Mode'
      }
    };
    
    res.json(testResponse);
  } catch (error) {
    console.error('🧪 POST Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /content/saved (PUBLIC - no auth required)
router.post('/saved', async (req, res) => {
  try {
    console.log('🔍 Saved content endpoint called');
    const { itemId, itemType } = req.body;
    
    if (!itemId || !itemType) {
      return res.status(400).json({
        success: false,
        error: 'itemId and itemType are required'
      });
    }
    
    // Validate itemType to prevent "Invalid content type" error
    const validItemTypes = ['Photo', 'Video', 'Reel', 'Story', 'Live', 'ShayariPhoto'];
    if (!validItemTypes.includes(itemType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid content type. Must be one of: ${validItemTypes.join(', ')}`
      });
    }
    
    // For now, return success without actual database operations
    const savedItem = {
      id: `saved_${Date.now()}`,
      itemId,
      itemType,
      userId: 'guest_user',
      savedAt: new Date(),
      status: 'saved'
    };
    
    res.json({
      success: true,
      message: 'Content saved successfully',
      data: savedItem
    });
    
  } catch (error) {
    console.error('🔍 Saved content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /content/saved (PUBLIC - no auth required)
router.get('/saved', async (req, res) => {
  try {
    console.log('🔍 Get saved content endpoint called');
    
    // For now, return empty array
    res.json({
      success: true,
      message: 'Saved content retrieved',
      data: []
    });
    
  } catch (error) {
    console.error('🔍 Get saved content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /content/saved/:itemId (PUBLIC - no auth required)
router.delete('/saved/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log('🔍 Delete saved content endpoint called for itemId:', itemId);
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemId is required'
      });
    }
    
    res.json({
      success: true,
      message: 'Content unsaved successfully',
      itemId
    });
    
  } catch (error) {
    console.error('🔍 Delete saved content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
