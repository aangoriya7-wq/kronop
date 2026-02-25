// ==================== MONGODB API ====================
// Direct MongoDB operations for client-side services
// All operations use environment variables for security

const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/db');

// POST /api/mongodb/insert - Insert document
router.post('/insert', async (req, res) => {
  try {
    const { collection, document, database } = req.body;
    
    if (!collection || !document) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection and document are required' 
      });
    }

    const db = await connectToDatabase();
    const dbCollection = db.collection(collection);
    
    const result = await dbCollection.insertOne(document);
    
    res.json({ 
      success: true, 
      data: { insertedId: result.insertedId },
      message: 'Document inserted successfully'
    });
    
  } catch (error) {
    console.error('❌ MongoDB Insert Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Insert operation failed' 
    });
  }
});

// POST /api/mongodb/find - Find documents
router.post('/find', async (req, res) => {
  try {
    const { collection, query = {}, options = {}, database } = req.body;
    
    if (!collection) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection is required' 
      });
    }

    const db = await connectToDatabase();
    const dbCollection = db.collection(collection);
    
    let cursor = dbCollection.find(query);
    
    // Apply options
    if (options.limit) cursor = cursor.limit(parseInt(options.limit));
    if (options.skip) cursor = cursor.skip(parseInt(options.skip));
    if (options.sort) cursor = cursor.sort(options.sort);
    
    const documents = await cursor.toArray();
    
    res.json({ 
      success: true, 
      data: documents,
      count: documents.length
    });
    
  } catch (error) {
    console.error('❌ MongoDB Find Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Find operation failed' 
    });
  }
});

// POST /api/mongodb/update - Update document
router.post('/update', async (req, res) => {
  try {
    const { collection, query, update, database } = req.body;
    
    if (!collection || !query || !update) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection, query, and update are required' 
      });
    }

    const db = await connectToDatabase();
    const dbCollection = db.collection(collection);
    
    const result = await dbCollection.updateOne(query, { $set: update });
    
    res.json({ 
      success: true, 
      data: { 
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      },
      message: 'Document updated successfully'
    });
    
  } catch (error) {
    console.error('❌ MongoDB Update Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Update operation failed' 
    });
  }
});

// POST /api/mongodb/delete - Delete document
router.post('/delete', async (req, res) => {
  try {
    const { collection, query, database } = req.body;
    
    if (!collection || !query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection and query are required' 
      });
    }

    const db = await connectToDatabase();
    const dbCollection = db.collection(collection);
    
    const result = await dbCollection.deleteOne(query);
    
    res.json({ 
      success: true, 
      data: { deletedCount: result.deletedCount },
      message: 'Document deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ MongoDB Delete Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Delete operation failed' 
    });
  }
});

// POST /api/mongodb/count - Count documents
router.post('/count', async (req, res) => {
  try {
    const { collection, query = {}, database } = req.body;
    
    if (!collection) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection is required' 
      });
    }

    const db = await connectToDatabase();
    const dbCollection = db.collection(collection);
    
    const count = await dbCollection.countDocuments(query);
    
    res.json({ 
      success: true, 
      count,
      message: 'Count operation successful'
    });
    
  } catch (error) {
    console.error('❌ MongoDB Count Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Count operation failed' 
    });
  }
});

module.exports = router;
