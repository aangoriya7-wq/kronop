const express = require('express');
const router = express.Router();
// const DatabaseService = require('../services/databaseService'); // Service removed
// const UserInterestTrackingService = require('../services/userInterestTrackingService'); // Service removed
const Content = require('../models/Content');
const SignedUrlService = require('../services/signedUrlService');
const uniqueViewService = require('../services/uniqueViewService');
const optimizedViewService = require('../services/optimizedViewService');

// GET /api/reels - Smart feed based on user interests
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, userId, category } = req.query;
  const parsedPage = parseInt(page);
  const parsedLimit = Math.min(parseInt(limit), 50);

  try {

    if (!userId) {
      const trendingReels = await UserInterestTrackingService.getTrendingContent('Reel', parsedLimit);
      const reelsWithUrls = SignedUrlService.generateSignedUrlsForContent(trendingReels);
      
      return res.json({
        success: true,
        data: reelsWithUrls,
        message: 'Trending reels for new user',
        isSmartFeed: false,
        isNewUser: true
      });
    }

    // Get user's interest profile
    const userProfile = await UserInterestTrackingService.getUserInterestProfile(userId);
    
    if (userProfile.isNewUser || userProfile.totalInteractions < 5) {
      const trendingReels = await UserInterestTrackingService.getTrendingContent('Reel', parsedLimit);
      const reelsWithUrls = SignedUrlService.generateSignedUrlsForContent(trendingReels);
      
      return res.json({
        success: true,
        data: reelsWithUrls,
        message: 'Trending reels for new user',
        isSmartFeed: false,
        isNewUser: true,
        userInteractions: userProfile.totalInteractions
      });
    }

    // Get user's top categories for filtering
    const topCategories = userProfile.topCategories.map(cat => cat.category);

    // Build smart query with optimized unique view filtering
    const smartQuery = await optimizedViewService.getUnseenReelsQuery(userId, {
      type: 'Reel',
      is_active: true
    });

    // Add category filter if user has interests
    if (topCategories.length > 0) {
      if (smartQuery.$or) {
        smartQuery.$or.push(
          { category: { $in: topCategories } },
          { tags: { $in: topCategories } }
        );
      } else {
        smartQuery.$or = [
          { category: { $in: topCategories } },
          { tags: { $in: topCategories } }
        ];
      }
    }


    // Get content with smart filtering (optimized for performance)
    let reels = await Content.find(smartQuery)
      .sort({ created_at: -1 })
      .limit(parsedLimit * 2) // Get more to calculate relevance
      .select('title url thumbnail tags category views likes created_at user_id')
      .hint('type_1_is_active_1_created_at_-1') // Use optimized index
      .lean() // Better performance
      .exec();

    // Calculate relevance scores and sort
    const reelsWithRelevance = [];
    for (const reel of reels) {
      const relevance = await UserInterestTrackingService.calculateContentRelevance(userId, reel);
      reelsWithRelevance.push({
        ...reel.toObject(),
        relevanceScore: relevance.score,
        matchedInterests: relevance.matchedInterests
      });
    }

    // Sort by relevance score (highest first) and paginate
    reelsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const paginatedReels = reelsWithRelevance.slice(
      (parsedPage - 1) * parsedLimit,
      parsedPage * parsedLimit
    );

    // Generate signed URLs
    const reelsWithUrls = SignedUrlService.generateSignedUrlsForContent(paginatedReels);


    res.json({
      success: true,
      data: reelsWithUrls,
      message: 'Smart feed based on your interests',
      isSmartFeed: true,
      isNewUser: false,
      userInteractions: userProfile.totalInteractions,
      topCategories: userProfile.topCategories.slice(0, 5),
      pageInfo: {
        currentPage: parsedPage,
        itemsPerPage: parsedLimit,
        totalItems: reelsWithRelevance.length
      }
    });

  } catch (error) {
    console.error('❌ Smart reels feed error:', error);
    // Fallback to basic content if smart feed fails
    try {
      const fallbackReels = await DatabaseService.getContentByType('Reel', parsedPage, parsedLimit, 0);
      const reelsWithUrls = SignedUrlService.generateSignedUrlsForContent(fallbackReels);
      
      res.json({
        success: true,
        data: reelsWithUrls,
        message: 'Reels (fallback mode)',
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

// GET /api/reels/user - Get user's own reels
router.get('/user', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const effectiveUserId = userId || process.env.DEFAULT_USER_ID || null;
    
    const content = await DatabaseService.getUserContent(effectiveUserId, 'Reel', parseInt(page), parseInt(limit));
    const contentWithUrls = SignedUrlService.generateSignedUrlsForContent(content);
    
    res.json({ success: true, data: contentWithUrls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reels/:id/like - Like a reel and track interest
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

// POST /api/reels/:id/view - Track view and watch time
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, watchTime = 0 } = req.body;
    
    // Increment views in content
    const content = await DatabaseService.incrementViews(id);
    
    // Track user interest if userId provided
    if (userId) {
      await UserInterestTrackingService.trackUserInteraction(userId, id, 'view', watchTime);
    }
    
    res.json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reels/:id/save - Save a reel and track interest
router.post('/:id/save', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Save content to user's saved collection
    const result = await DatabaseService.saveContent(userId, id, 'Reel');
    
    // Track user interest if userId provided
    if (userId) {
      await UserInterestTrackingService.trackUserInteraction(userId, id, 'save');
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reels/interests/:userId - Get user's interest profile for reels
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

// POST /api/reels/track/view - Track when user views a reel (optimized)
router.post('/track/view', async (req, res) => {
  try {
    const { userId, reelId, viewDuration = 0, totalDuration = 0 } = req.body;
    
    if (!userId || !reelId) {
      return res.status(400).json({ 
        error: 'userId and reelId are required' 
      });
    }


    // Track the view using optimized view service
    const result = await optimizedViewService.trackReelView(
      userId, 
      reelId, 
      viewDuration, 
      totalDuration
    );

    // Also track user interest for recommendation algorithm
    if (result.success && !result.alreadyViewed) {
      await UserInterestTrackingService.trackUserInteraction(
        userId, 
        reelId, 
        'view', 
        { 
          duration: viewDuration, 
          completed: result.completed 
        }
      );
    }

    res.json({
      success: true,
      data: result,
      message: result.alreadyViewed ? 'View already tracked' : 'View tracked successfully'
    });

  } catch (error) {
    console.error('❌ Error tracking reel view:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reels/track/batch - Batch track multiple views (for high traffic)
router.post('/track/batch', async (req, res) => {
  try {
    const { userId, views } = req.body;
    
    if (!userId || !Array.isArray(views)) {
      return res.status(400).json({ 
        error: 'userId and views array are required' 
      });
    }


    // Track using optimized batch service
    const result = await optimizedViewService.batchTrackViews({ userId, views });

    res.json({
      success: result.success,
      data: result.data,
      message: `Batch tracking completed for ${views.length} views`
    });

  } catch (error) {
    console.error('❌ Error in batch view tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reels/user/:userId/seen - Get user's seen reels
router.get('/user/:userId/seen', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const seenReels = await uniqueViewService.getUserSeenReels(userId);
    const stats = await uniqueViewService.getViewStats(userId);

    res.json({
      success: true,
      data: {
        seenReels,
        stats,
        totalSeen: seenReels.length
      },
      message: 'User seen reels retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting user seen reels:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reels/user/:userId/reset - Reset user's seen reels
router.post('/user/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await uniqueViewService.resetUserViews(userId);

    res.json({
      success: result.success,
      message: result.success ? 'User views reset successfully' : 'Failed to reset views'
    });

  } catch (error) {
    console.error('❌ Error resetting user views:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reels/track/batch - Track multiple interactions at once
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
