const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
// const redis = require('../services/redisCacheService'); // Service removed

// Ultra-fast viral content API with Redis caching and MongoDB indexing
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'trending' } = req.query;
    const cacheKey = `viral:${page}:${limit}:${sort}`;
    
    // Try Redis cache first (5-minute TTL)
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: Date.now()
      });
    }

    // Build optimized query with proper indexing
    let sortOptions = {};
    let filter = { status: 'public' }; // Only public content

    switch (sort) {
      case 'trending':
        // Trending algorithm: weighted by recent engagement
        sortOptions = {
          score: { $meta: 'textScore' },
          likes_count: -1,
          views_count: -1,
          created_at: -1
        };
        // Add trending score calculation
        filter.$expr = {
          $add: [
            { $multiply: ['$likes_count', 10] },
            { $multiply: ['$views_count', 1] },
            { $divide: [
              { $subtract: [new Date(), '$created_at'] },
              1000 * 60 * 60 * 24 // Days since creation
            ]}
          ]
        };
        break;
      case 'likes':
        sortOptions = { likes_count: -1, created_at: -1 };
        break;
      case 'views':
        sortOptions = { views_count: -1, created_at: -1 };
        break;
      case 'recent':
        sortOptions = { created_at: -1 };
        break;
      default:
        sortOptions = { likes_count: -1, views_count: -1, created_at: -1 };
    }

    // Optimized MongoDB query with lean() for performance
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [viralContent, totalCount] = await Promise.all([
      Content.find(filter)
        .select('id title thumbnail_url image_url likes_count views_count user_profiles type created_at')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean() // Return plain JavaScript objects for better performance
        .hint('likes_count_1_views_count_-1_created_at_-1') // Use optimized index
        .exec(),
      
      Content.countDocuments(filter)
        .hint('status_1_likes_count_-1')
        .exec()
    ]);

    // Cache the result for 5 minutes
    await redis.set(cacheKey, viralContent, 300);

    res.json({
      success: true,
      data: viralContent,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        total_items: totalCount,
        has_more: skip + viralContent.length < totalCount
      },
      cached: false,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Viral API Error:', error);
    
    // Fallback to basic query if optimized query fails
    try {
      const fallbackContent = await Content.find({ status: 'public' })
        .select('id title thumbnail_url image_url likes_count views_count user_profiles type')
        .sort({ likes_count: -1, created_at: -1 })
        .limit(20)
        .lean()
        .exec();

      res.json({
        success: true,
        data: fallbackContent,
        fallback: true,
        timestamp: Date.now()
      });
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch viral content',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// Real-time trending score update endpoint
router.post('/update-score/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { engagement } = req.body; // { likes: 5, views: 20, comments: 2 }
    
    // Update content scores in real-time
    const updateData = {
      $inc: {
        likes_count: engagement.likes || 0,
        views_count: engagement.views || 0,
        comments_count: engagement.comments || 0
      },
      $set: { updated_at: new Date() }
    };

    await Content.findByIdAndUpdate(contentId, updateData, { 
      new: true,
      upsert: false 
    });

    // Clear related cache entries
    const cachePattern = 'viral:*';
    await redis.clearPattern(cachePattern);

    res.json({
      success: true,
      message: 'Score updated successfully'
    });

  } catch (error) {
    console.error('❌ Score update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update score'
    });
  }
});

// Pre-warm cache for popular pages
router.post('/warm-cache', async (req, res) => {
  try {
    const { pages = [1, 2, 3] } = req.body;
    
    for (const page of pages) {
      const cacheKey = `viral:${page}:20:trending`;
      
      // Generate and cache content
      const content = await Content.find({ status: 'public' })
        .select('id title thumbnail_url image_url likes_count views_count user_profiles type created_at')
        .sort({ likes_count: -1, views_count: -1, created_at: -1 })
        .skip((page - 1) * 20)
        .limit(20)
        .lean()
        .exec();

      await redis.set(cacheKey, content, 300);
    }

    res.json({
      success: true,
      message: `Cache warmed for ${pages.length} pages`
    });

  } catch (error) {
    console.error('❌ Cache warming error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
});

module.exports = router;
