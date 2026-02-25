// MongoDB Indexing Script for Viral Content Performance
// Optimized for 2M+ users with millisecond query times

const mongoose = require('mongoose');
const Content = require('../models/Content');
const User = require('../models/User');

// Connection string - update with your MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;

async function createOptimizedIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🚀 Creating optimized indexes for viral content and unique views...');

    // 1. Primary viral content index (most important)
    console.log('📊 Creating viral content index...');
    await Content.collection.createIndex(
      { 
        status: 1, 
        likes_count: -1, 
        views_count: -1, 
        created_at: -1 
      },
      { 
        name: 'viral_content_main',
        background: true 
      }
    );

    // 2. UNIQUE VIEW SYSTEM INDEXES FOR USER MODEL
    
    // 3. User seen_reels index for fast filtering
    console.log('👤 Creating user seen_reels index...');
    await User.collection.createIndex(
      { 
        'seen_reels.reel_id': 1 
      },
      { 
        name: 'user_seen_reels_reel_id',
        background: true 
      }
    );

    // 4. Compound index for seen_reels with timestamp
    console.log('⏰ Creating user seen_reels timestamp index...');
    await User.collection.createIndex(
      { 
        _id: 1,
        'seen_reels.viewed_at': -1 
      },
      { 
        name: 'user_seen_reels_timestamp',
        background: true 
      }
    );

    // 5. Index for cleanup operations
    console.log('🧹 Creating user seen_reels cleanup index...');
    await User.collection.createIndex(
      { 
        'seen_reels.viewed_at': 1 
      },
      { 
        name: 'user_seen_reels_cleanup',
        background: true 
      }
    );

    // 6. Content indexes for $nin operations
    console.log('🎯 Creating content $nin optimization index...');
    await Content.collection.createIndex(
      { 
        status: 1,
        type: 1,
        created_at: -1,
        _id: 1
      },
      { 
        name: 'content_nin_optimization',
        background: true 
      }
    );

    // 7. Trending algorithm index (weighted scoring)
    console.log('📈 Creating trending score index...');
    await Content.collection.createIndex(
      { 
        status: 1,
        score: { $meta: 'textScore' },
        likes_count: -1,
        views_count: -1,
        created_at: -1
      },
      { 
        name: 'trending_score_index',
        background: true 
      }
    );

    // 8. Real-time engagement updates
    console.log('⚡ Creating engagement update index...');
    await Content.collection.createIndex(
      { 
        _id: 1,
        updated_at: 1 
      },
      { 
        name: 'engagement_updates',
        background: true 
      }
    );

    // 9. Content type filtering for performance
    console.log('🎯 Creating content type index...');
    await Content.collection.createIndex(
      { 
        status: 1,
        type: 1,
        likes_count: -1,
        created_at: -1
      },
      { 
        name: 'content_type_filter',
        background: true 
      }
    );

    // 10. Pagination optimization with $nin support
    console.log('📄 Creating pagination index with $nin...');
    await Content.collection.createIndex(
      { 
        status: 1,
        type: 1,
        created_at: -1,
        _id: 1
      },
      { 
        name: 'pagination_nin_optimized',
        background: true 
      }
    );

    // 11. Cache warming index
    console.log('🔥 Creating cache warming index...');
    await Content.collection.createIndex(
      { 
        status: 1,
        likes_count: -1,
        views_count: -1
      },
      { 
        name: 'cache_warming',
        background: true 
      }
    );

    // 12. User content lookup for analytics
    console.log('👥 Creating user analytics index...');
    await User.collection.createIndex(
      { 
        _id: 1,
        'seen_reels.completed': 1,
        'seen_reels.viewed_at': -1
      },
      { 
        name: 'user_view_analytics',
        background: true 
      }
    );

    // 13. Compound index for complex queries with $nin
    console.log('🔍 Creating complex query index with $nin...');
    await Content.collection.createIndex(
      { 
        status: 1,
        type: 1,
        likes_count: -1,
        views_count: -1,
        comments_count: -1,
        created_at: -1,
        _id: 1
      },
      { 
        name: 'complex_queries_nin',
        background: true 
      }
    );

    console.log('🎉 All indexes created successfully!');

    // Show index statistics
    console.log('\n📋 Content indexes:');
    const contentIndexes = await Content.collection.getIndexes();
    Object.keys(contentIndexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, JSON.stringify(contentIndexes[indexName].key));
    });

    console.log('\n👤 User indexes:');
    const userIndexes = await User.collection.getIndexes();
    Object.keys(userIndexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, JSON.stringify(userIndexes[indexName].key));
    });

    // Simulate a user with some seen reels
    const testUserId = 'test_user_123';
    const testSeenReels = [process.env.DEFAULT_USER_ID || '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
    
    const explainResult = await Content.find({
      status: 'public',
      _id: { $nin: testSeenReels.map(id => mongoose.Types.ObjectId(id)) }
    })
    .sort({ created_at: -1 })
    .limit(20)
    .explain('executionStats');

    console.log('📊 $nin Query execution stats:');
    console.log(`  - Execution time: ${explainResult.executionStats.executionTimeMillis}ms`);
    console.log(`  - Documents examined: ${explainResult.executionStats.totalDocsExamined}`);
    console.log(`  - Documents returned: ${explainResult.executionStats.nReturned}`);
    console.log(`  - Index used: ${explainResult.executionStats.winningPlan?.inputStage?.indexName || 'COLLSCAN'}`);

    // Test user seen_reels query performance
    console.log('\n👤 Analyzing user seen_reels query performance...');
    const userExplainResult = await User.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(testUserId) } },
      { $project: { seen_reels: 1 } },
      { $unwind: '$seen_reels' },
      { $sort: { 'seen_reels.viewed_at': -1 } },
      { $limit: 50 }
    ]).explain('executionStats');

    console.log('📊 User seen_reels query stats:');
    console.log(`  - Execution time: ${userExplainResult.executionStats.executionTimeMillis}ms`);

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Drop existing indexes (optional - use with caution)
async function dropExistingIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    console.log('⚠️ Dropping existing indexes (except _id_)...');
    await Content.collection.dropIndexes();
    await User.collection.dropIndexes();
    console.log('✅ Existing indexes dropped');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'drop') {
  console.log('⚠️ WARNING: This will drop all existing indexes!');
  setTimeout(() => {
    dropExistingIndexes();
  }, 3000);
} else if (command === 'create') {
  createOptimizedIndexes();
} else {
  console.log('Usage:');
  console.log('  node createViralIndexes.js create  - Create optimized indexes');
  console.log('  node createViralIndexes.js drop    - Drop all existing indexes');
}

module.exports = { createOptimizedIndexes, dropExistingIndexes };
