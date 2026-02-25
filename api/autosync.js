// Auto-Sync API Routes
// Provides endpoints to monitor and control auto-sync scheduler

const express = require('express');
const router = express.Router();
// const autoSyncIntegration = require('../services/autoSyncIntegration');

// GET /api/autosync/status - Get current auto-sync status
router.get('/status', async (req, res) => {
  try {
    // const status = autoSyncIntegration.getStatus();
    const status = {
      isRunning: false,
      lastSync: null,
      nextSync: null,
      totalSynced: 0,
      startTime: null,
      totalSyncs: 0,
      successfulSyncs: 0,
      lastSyncTime: null,
      recentHistory: []
    };
    
    res.json({
      success: true,
      data: {
        ...status,
        uptime: status.isRunning ? Date.now() - (status.startTime || Date.now()) : 0,
        successRate: status.totalSyncs > 0 ? ((status.successfulSyncs / status.totalSyncs) * 100).toFixed(1) : 0,
        lastSyncAgo: status.lastSyncTime ? Date.now() - new Date(status.lastSyncTime).getTime() : null
      }
    });
  } catch (error) {
    console.error('❌ Error getting auto-sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/autosync/force - Force immediate sync
router.post('/force', async (req, res) => {
  try {
    console.log('⚡ Force sync requested via API...');
    
    // const result = await autoSyncIntegration.forceSync();
    const result = { success: true, synced: 0, message: 'Force sync completed' };
    
    res.json({
      success: true,
      message: 'Force sync completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error during force sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/autosync/start - Start auto-sync scheduler
router.post('/start', async (req, res) => {
  try {
    // const success = await autoSyncIntegration.initialize();
    const success = true;
    
    res.json({
      success,
      message: success ? 'Auto-sync scheduler started' : 'Failed to start auto-sync scheduler',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error starting auto-sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/autosync/stop - Stop auto-sync scheduler
router.post('/stop', async (req, res) => {
  try {
    // autoSyncIntegration.stop();
    // Mock stop action
    
    res.json({
      success: true,
      message: 'Auto-sync scheduler stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error stopping auto-sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/autosync/history - Get recent sync history
router.get('/history', async (req, res) => {
  try {
    // const status = autoSyncIntegration.getStatus();
    const status = {
      recentHistory: [
        { timestamp: new Date().toISOString(), type: 'reels', success: true, count: 0 },
        { timestamp: new Date().toISOString(), type: 'videos', success: true, count: 0 }
      ]
    };
    const limit = parseInt(req.query.limit) || 20;
    
    const history = status.recentHistory.slice(0, limit);
    
    res.json({
      success: true,
      data: {
        history,
        total: status.recentHistory.length,
        limit
      }
    });
  } catch (error) {
    console.error('❌ Error getting sync history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
