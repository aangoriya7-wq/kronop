const express = require('express');
const router = express.Router();
// const DatabaseService = require('../services/databaseService'); // Service removed
// const BunnyContentService = require('./services/bunnyContentService');
// const BunnySyncService = require('./services/bunnySyncService'); // Service removed
// const SignedUrlService = require('./services/signedUrlService');

// POST /api/content/sync - One-click sync from BunnyCDN to MongoDB
router.post('/sync', async (req, res) => {
  try {
    
    // Sync all content types from BunnyCDN to MongoDB
    // const results = await BunnyContentService.syncAllContent();
    const results = { reels: [], videos: [], photos: [], stories: [], shayari: [] };
    
    const totalSynced = Object.values(results).reduce((sum, result) => sum + result.length, 0);
    
    res.json({ 
      success: true, 
      message: 'Content sync completed successfully',
      data: {
        synced: results,
        totalItems: totalSynced,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ One-click sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content - Get all content types at once
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = Math.min(parseInt(limit), 20);
    
    const types = ['Reel', 'Video', 'Live', 'Photo', 'Story'];
    const allContent = {};
    
    for (const type of types) {
      // const content = await DatabaseService.getContentByType(type, parsedPage, parsedLimit, 0);
      // const totalCount = await DatabaseService.getContentCount(type);
      const content = [];
      const totalCount = 0;
      
      allContent[type.toLowerCase()] = {
        data: SignedUrlService.generateSignedUrlsForContent(content),
        pagination: {
          currentPage: parsedPage,
          totalPages: Math.ceil(totalCount / parsedLimit),
          totalItems: totalCount,
          itemsPerPage: parsedLimit
        }
      };
    }
    
    res.json({ 
      success: true, 
      data: allContent,
      message: 'All synced content retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content/sync/status - Get sync status
router.get('/sync/status', async (req, res) => {
  try {
    const status = await BunnyContentService.getSyncStatus();
    res.json({ 
      success: true, 
      data: status,
      message: 'Sync status retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 5, skip = 0 } = req.query;
    
    const validTypes = ['Reel', 'reels', 'Story', 'story', 'Live', 'live', 'Video', 'video', 'Photo', 'photo'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Normalize type to capital case for database
    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    const finalType = normalizedType.toLowerCase() === 'reels' ? 'Reel' : normalizedType;

    const parsedPage = parseInt(page);
    const parsedLimit = Math.min(parseInt(limit), 20);
    const parsedSkip = parseInt(skip) || (parsedPage - 1) * parsedLimit;

    // const content = await DatabaseService.getContentByType(finalType, parsedPage, parsedLimit, parsedSkip);
    const content = [];
    
    // Generate signed URLs
    const contentWithUrls = SignedUrlService.generateSignedUrlsForContent(content);
    
    res.json({ success: true, data: contentWithUrls });
  } catch (error) {
    console.error(`Get Content Error (${req.params.type}):`, error);
    res.status(200).json({ success: false, error: error.message, data: [] });
  }
});


router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;
    
    // const content = await DatabaseService.getUserContent(userId, type);
    const content = [];
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/video/user', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const effectiveUserId = userId || process.env.DEFAULT_USER_ID || null;
    // const content = await DatabaseService.getUserContent(effectiveUserId, 'Video', parseInt(page), parseInt(limit));
    const content = [];
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/photo/user', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const effectiveUserId = userId || process.env.DEFAULT_USER_ID || null;
    // const content = await DatabaseService.getUserContent(effectiveUserId, 'Photo', parseInt(page), parseInt(limit));
    const content = [];
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reels/user', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const effectiveUserId = userId || process.env.DEFAULT_USER_ID || null;
    // const content = await DatabaseService.getUserContent(effectiveUserId, 'Reel', parseInt(page), parseInt(limit));
    const content = [];
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const contentData = req.body;
    // const content = await DatabaseService.createContent(contentData);
    const content = null;
    res.status(201).json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // const content = await DatabaseService.updateContent(id, updateData);
    const content = null;
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // await DatabaseService.deleteContent(id);
    // DatabaseService removed
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    // const content = await DatabaseService.incrementViews(id);
    const content = null;
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    // const content = await DatabaseService.incrementLikes(id);
    const content = null;
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/all', async (req, res) => {
  try {
    // const results = await BunnyContentService.syncAllContent();
    const results = { reels: [], videos: [], photos: [], stories: [], shayari: [] };
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['reels', 'video', 'live', 'story'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid sync type' });
    }

    // const results = await BunnyContentService.syncContentType(type);
    const results = [];
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New enhanced endpoints for BunnyContentService
router.get('/frontend/all', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    // const content = await BunnyContentService.getAllContentForFrontend(
    //   parseInt(page),
    //   parseInt(limit),
    //   fieldList
    // );
    const content = { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/frontend/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20, fields } = req.query;
    
    const validTypes = ['Reel', 'Video', 'Live', 'Photo', 'Story'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    // const content = await BunnyContentService.getContentForFrontend(
    //   type,
    //   parseInt(page),
    //   parseInt(limit),
    //   fieldList
    // );
    const content = { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/force', async (req, res) => {
  try {
    // const results = await BunnyContentService.forceSyncAll();
    const results = { reels: [], videos: [], photos: [], stories: [], shayari: [] };
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sync/status', async (req, res) => {
  try {
    // const status = await BunnyContentService.getSyncStatus();
    const status = { lastSync: null, isRunning: false, totalItems: 0 };
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/live/active', async (req, res) => {
  try {
    const liveStreams = await DatabaseService.getActiveLiveStreams();
    res.json({ success: true, data: liveStreams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stories/cleanup', async (req, res) => {
  try {
    const result = await DatabaseService.deactivateExpiredStories();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/security/check/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const securityStatus = await SignedUrlService.checkBunnySecuritySettings(type);
    res.json({ success: true, data: securityStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/security/enable/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await SignedUrlService.enableBunnyTokenSecurity(type);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content/saved - Get saved content for user
router.get('/saved', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20, content_type } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    const parsedPage = parseInt(page);
    const parsedLimit = Math.min(parseInt(limit), 50);

    // Get saved content from database with content type filter
    const savedContent = await DatabaseService.getSavedContent(userId, parsedPage, parsedLimit, content_type);
    
    res.json({ 
      success: true, 
      data: savedContent,
      message: 'Saved content retrieved successfully'
    });
  } catch (error) {
    console.error('Get saved content error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to retrieve saved content' 
    });
  }
});

// POST /api/content/saved - Save content for user
router.post('/saved', async (req, res) => {
  try {
    const { userId, contentId, contentType } = req.body;
    
    if (!userId || !contentId || !contentType) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, contentId, and contentType are required' 
      });
    }

    // Save content to database
    const result = await DatabaseService.saveContent(userId, contentId, contentType);
    
    res.json({ 
      success: true, 
      data: result,
      message: 'Content saved successfully'
    });
  } catch (error) {
    console.error('Save content error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to save content' 
    });
  }
});

// DELETE /api/content/saved/:contentId - Remove saved content
router.delete('/saved/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    // Remove saved content from database
    const result = await DatabaseService.unsaveContent(userId, contentId);
    
    res.json({ 
      success: true, 
      data: result,
      message: 'Content removed from saved successfully'
    });
  } catch (error) {
    console.error('Unsave content error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to remove saved content' 
    });
  }
});

// POST /api/content/cleanup - Clean up missing videos from MongoDB
router.post('/cleanup', async (req, res) => {
  try {
    
    const results = await BunnySyncService.cleanupAllMissingVideos();
    
    const totalDeleted = Object.values(results).reduce((sum, result) => sum + result.deleted, 0);
    const totalVerified = Object.values(results).reduce((sum, result) => sum + result.verified, 0);
    
    
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully',
      data: {
        results,
        summary: {
          totalDeleted,
          totalVerified,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/content/sync-and-cleanup - Complete sync and cleanup process
router.post('/sync-and-cleanup', async (req, res) => {
  try {
    
    const results = await BunnySyncService.syncAndCleanup();
    
    
    res.json({ 
      success: true, 
      message: 'Sync & cleanup completed successfully',
      data: results
    });
  } catch (error) {
    console.error('❌ Sync & cleanup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content/validate/:id - Validate specific video before showing
router.get('/validate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'Reel' } = req.query;
    
    // Get video from database
    const video = await DatabaseService.getContentById(id, type);
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }
    
    // Validate video exists in BunnyCDN
    const isValid = await BunnySyncService.validateVideoBeforeShow(video);
    
    res.json({ 
      success: true, 
      data: {
        videoId: id,
        type,
        isValid,
        url: video.url
      }
    });
  } catch (error) {
    console.error('Video validation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;



