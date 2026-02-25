// ==================== SUPPORT API ====================
// Handle support/unsupport operations for reels
// Sync with BunnyCDN + MongoDB

const express = require('express');
const router = express.Router();
const MongoClient = require('mongodb').MongoClient;

// MongoDB Connection - ONLY ENVIRONMENT VARIABLES
const MONGODB_URI = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'kronop';

let db;
let client;

// Initialize MongoDB connection
async function connectToMongoDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ Support API: Connected to MongoDB');
    }
    return db;
  } catch (error) {
    console.error('❌ Support API: MongoDB connection failed:', error);
    throw error;
  }
}

// POST /api/support - Toggle support for a reel
router.post('/', async (req, res) => {
  try {
    await connectToMongoDB();
    
    const { reelId, userId, isSupported, timestamp } = req.body;
    
    if (!reelId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing reelId or userId' 
      });
    }
    
    const collection = db.collection('supports');
    
    // Update or insert support record
    await collection.updateOne(
      { reelId, userId },
      { 
        $set: { 
          reelId, 
          userId, 
          isSupported, 
          timestamp: timestamp || Date.now(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log(`🎯 Support ${isSupported ? 'added' : 'removed'} for reel ${reelId} by user ${userId}`);
    
    res.json({ 
      success: true, 
      isSupported,
      message: `Support ${isSupported ? 'added' : 'removed'} successfully`
    });
    
  } catch (error) {
    console.error('❌ Support toggle error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/support/sync - Sync multiple support records
router.post('/sync', async (req, res) => {
  try {
    await connectToMongoDB();
    
    const { supportData } = req.body;
    
    if (!Array.isArray(supportData)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid support data format' 
      });
    }
    
    const collection = db.collection('supports');
    
    // Bulk update operations
    const bulkOps = supportData.map(support => ({
      updateOne: {
        filter: { reelId: support.reelId, userId: support.userId },
        update: { 
          $set: { 
            ...support,
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));
    
    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
    }
    
    console.log(`🔄 Synced ${supportData.length} support records to MongoDB`);
    
    res.json({ 
      success: true, 
      synced: supportData.length,
      message: `Synced ${supportData.length} support records`
    });
    
  } catch (error) {
    console.error('❌ Support sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sync failed' 
    });
  }
});

// GET /api/support/count/:reelId - Get support count for a reel
router.get('/count/:reelId', async (req, res) => {
  try {
    await connectToMongoDB();
    
    const { reelId } = req.params;
    
    const collection = db.collection('supports');
    const count = await collection.countDocuments({ 
      reelId, 
      isSupported: true 
    });
    
    res.json({ 
      success: true, 
      count,
      reelId
    });
    
  } catch (error) {
    console.error('❌ Support count error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get support count' 
    });
  }
});

// GET /api/support/user/:userId - Get all supports by a user
router.get('/user/:userId', async (req, res) => {
  try {
    await connectToMongoDB();
    
    const { userId } = req.params;
    
    const collection = db.collection('supports');
    const supports = await collection.find({ userId }).toArray();
    
    res.json({ 
      success: true, 
      supports,
      count: supports.length
    });
    
  } catch (error) {
    console.error('❌ User supports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user supports' 
    });
  }
});

// GET /api/support/reel/:reelId - Get all supports for a reel
router.get('/reel/:reelId', async (req, res) => {
  try {
    await connectToMongoDB();
    
    const { reelId } = req.params;
    
    const collection = db.collection('supports');
    const supports = await collection.find({ 
      reelId, 
      isSupported: true 
    }).toArray();
    
    res.json({ 
      success: true, 
      supports,
      count: supports.length
    });
    
  } catch (error) {
    console.error('❌ Reel supports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get reel supports' 
    });
  }
});

// DELETE /api/support/:reelId/:userId - Remove support
router.delete('/:reelId/:userId', async (req, res) => {
  try {
    await connectToMongoDB();
    
    const { reelId, userId } = req.params;
    
    const collection = db.collection('supports');
    const result = await collection.deleteOne({ reelId, userId });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️ Support removed for reel ${reelId} by user ${userId}`);
      res.json({ 
        success: true, 
        message: 'Support removed successfully'
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Support not found' 
      });
    }
    
  } catch (error) {
    console.error('❌ Support delete error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove support' 
    });
  }
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('🔌 Support API: MongoDB connection closed');
  }
  process.exit(0);
});

module.exports = router;
