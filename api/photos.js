const express = require('express');
const router = express.Router();
// const DatabaseService = require('../services/databaseService'); // Service removed
// const UserInterestTrackingService = require('../services/userInterestTrackingService'); // Service removed
const Content = require('../models/Content');
const SignedUrlService = require('../services/signedUrlService');

// GET /api/photos - Smart feed based on user interests
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, userId, category } = req.query;
  const parsedPage = parseInt(page);
  const parsedLimit = Math.min(parseInt(limit), 50);
  
  try {
    

    if (category && category !== 'all') {
      const categoryPhotos = await Content.find({
        type: 'Photo',
        category: category,
        is_active: true
      })
      .sort({ created_at: -1 })
      .limit(parsedLimit)
      .select('title url thumbnail tags category views likes created_at user_id');
      
      const photosWithUrls = SignedUrlService.generateSignedUrlsForContent(categoryPhotos);
      
      return res.json({
        success: true,
        data: photosWithUrls,
        message: `Photos in category: ${category}`,
        isSmartFeed: false,
        isCategoryFilter: true
      });
    }

    if (!userId) {
      const trendingPhotos = await UserInterestTrackingService.getTrendingContent('Photo', parsedLimit);
      const photosWithUrls = SignedUrlService.generateSignedUrlsForContent(trendingPhotos);
      
      return res.json({
        success: true,
        data: photosWithUrls,
        message: 'Trending photos for new user',
        isSmartFeed: false,
        isNewUser: true
      });
    }

    // Get user's interest profile
    const userProfile = await UserInterestTrackingService.getUserInterestProfile(userId);
    
    if (userProfile.isNewUser || userProfile.totalInteractions < 5) {
      const trendingPhotos = await UserInterestTrackingService.getTrendingContent('Photo', parsedLimit);
      const photosWithUrls = SignedUrlService.generateSignedUrlsForContent(trendingPhotos);
      
      return res.json({
        success: true,
        data: photosWithUrls,
        message: 'Trending photos for new user',
        isSmartFeed: false,
        isNewUser: true,
        userInteractions: userProfile.totalInteractions
      });
    }

    // Get user's top categories for filtering
    const topCategories = userProfile.topCategories.map(cat => cat.category);

    // Build smart query based on user interests
    const smartQuery = {
      type: 'Photo',
      is_active: true
    };

    // Add category filter if user has interests
    if (topCategories.length > 0) {
      smartQuery.$or = [
        { category: { $in: topCategories } },
        { tags: { $in: topCategories } }
      ];
    }

    // Get content with smart filtering
    let photos = await Content.find(smartQuery)
      .sort({ created_at: -1 })
      .limit(parsedLimit * 2) // Get more to calculate relevance
      .select('title url thumbnail tags category views likes created_at user_id');

    // Calculate relevance scores and sort
    const photosWithRelevance = [];
    for (const photo of photos) {
      const relevance = await UserInterestTrackingService.calculateContentRelevance(userId, photo);
      photosWithRelevance.push({
        ...photo.toObject(),
        relevanceScore: relevance.score,
        matchedInterests: relevance.matchedInterests
      });
    }

    // Sort by relevance score (highest first) and paginate
    photosWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const paginatedPhotos = photosWithRelevance.slice(
      (parsedPage - 1) * parsedLimit,
      parsedPage * parsedLimit
    );

    // Generate signed URLs
    const photosWithUrls = SignedUrlService.generateSignedUrlsForContent(paginatedPhotos);


    res.json({
      success: true,
      data: photosWithUrls,
      message: 'Smart feed based on your interests',
      isSmartFeed: true,
      isNewUser: false,
      userInteractions: userProfile.totalInteractions,
      topCategories: userProfile.topCategories.slice(0, 5),
      pageInfo: {
        currentPage: parsedPage,
        itemsPerPage: parsedLimit,
        totalItems: photosWithRelevance.length
      }
    });

  } catch (error) {
    console.error('❌ Smart photos feed error:', error);
    // Fallback to basic content if smart feed fails
    try {
      const fallbackPhotos = await DatabaseService.getContentByType('Photo', parsedPage, parsedLimit, 0);
      const photosWithUrls = SignedUrlService.generateSignedUrlsForContent(fallbackPhotos);
      
      res.json({
        success: true,
        data: photosWithUrls,
        message: 'Photos (fallback mode)',
        isSmartFeed: false,
        error: 'Smart feed temporarily unavailable'
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        data: []
      });
    }
  }
});

// GET /api/photos/user - Get user's own photos
router.get('/user', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const effectiveUserId = userId || process.env.DEFAULT_USER_ID || null;
    
    const content = await DatabaseService.getUserContent(effectiveUserId, 'Photo', parseInt(page), parseInt(limit));
    const contentWithUrls = SignedUrlService.generateSignedUrlsForContent(content);
    
    res.json({ success: true, data: contentWithUrls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/photos/categories - Get available photo categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Content.distinct('category', {
      type: 'Photo',
      is_active: true,
      category: { $ne: '', $exists: true }
    });
    
    res.json({
      success: true,
      data: categories.sort(),
      message: 'Photo categories retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/photos/:id/like - Like a photo and track interest
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Increment likes in content
    const content = await DatabaseService.incrementLikes(id);
    
    // Track user interest if userId provided
    if (userId) {
      await UserInterestTrackingService.trackUserInteraction(userId, id, 'like');
    }
    
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/photos/:id/view - Track view and watch time
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, viewTime = 0 } = req.body;
    
    // Increment views in content
    const content = await DatabaseService.incrementViews(id);
    
    // Track user interest if userId provided
    if (userId) {
      await UserInterestTrackingService.trackUserInteraction(userId, id, 'view', viewTime);
    }
    
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/photos/:id/save - Save a photo and track interest
router.post('/:id/save', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Save content to user's saved collection
    const result = await DatabaseService.saveContent(userId, id, 'Photo');
    
    // Track user interest if userId provided
    if (userId) {
      await UserInterestTrackingService.trackUserInteraction(userId, id, 'save');
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/photos/interests/:userId - Get user's interest profile for photos
router.get('/interests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userProfile = await UserInterestTrackingService.getUserInterestProfile(userId);
    
    res.json({
      success: true,
      data: userProfile,
      message: 'User interest profile retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/photos/track/batch - Track multiple interactions at once
router.post('/track/batch', async (req, res) => {
  try {
    const { interactions } = req.body;
    
    if (!Array.isArray(interactions)) {
      return res.status(400).json({ error: 'Interactions must be an array' });
    }
    
    const results = await UserInterestTrackingService.trackBatchInteractions(interactions);
    
    res.json({
      success: true,
      data: results,
      message: `Tracked ${interactions.length} interactions successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
