const express = require('express');
const router = express.Router();
// const DatabaseService = require('../services/databaseService'); // Service removed
const axios = require('axios');
const Notification = require('../models/Notification');

const getOneSignalConfig = () => {
  const appId = (process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || '').trim();
  const apiKey = (
    process.env.ONESIGNAL_REST_API_KEY ||
    process.env.ONE_SIGNAL_REST_API_KEY ||
    process.env.ONESIGNAL_API_KEY ||
    process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY ||
    ''
  ).trim();
  const url = (process.env.EXPO_PUBLIC_ONESIGNAL_API_URL || process.env.ONESIGNAL_API_URL || 'https://onesignal.com/api/v1/notifications').trim();

  return { appId, apiKey, url };
};

const sendOneSignalToPlayerId = async ({ playerId, title, body, data }) => {
  const { appId, apiKey, url } = getOneSignalConfig();
  if (!appId || !apiKey || !playerId) return;

  const notification = {
    app_id: appId,
    include_player_ids: [playerId],
    headings: { en: title },
    contents: { en: body },
    data: data || {}
  };

  const trySend = async (authorizationValue) => {
    const response = await axios.post(url, notification, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizationValue
      }
    });
    return response.data;
  };

  const isV2Key = apiKey.startsWith('os_v2_');
  const primaryAuth = isV2Key ? `Key ${apiKey}` : `Basic ${apiKey}`;
  const fallbackAuth = isV2Key ? `Basic ${apiKey}` : `Key ${apiKey}`;

  try {
    return await trySend(primaryAuth);
  } catch (error) {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && fallbackAuth !== primaryAuth) {
      return await trySend(fallbackAuth);
    }
    throw error;
  }
};

// POST /api/notifications/send
// Purpose: Send push notification to a specific user (Mocked since Firebase removed)
router.post('/send', async (req, res) => {
  const { recipientId, title, body, data } = req.body;

  if (!recipientId || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Get Recipient's Push Token from MongoDB
    const recipient = await DatabaseService.getUserById(recipientId);
    
    if (!recipient || !recipient.pushToken) {
      console.warn(`[Notifications] No token found for user ${recipientId}`);
      return res.status(404).json({ error: 'User not reachable (No Push Token)' });
    }

    // 2. Mock sending notification
    // In a real app without Firebase, you might use expo-server-sdk here.

    res.json({ success: true, message: 'Notification sent (Mocked)' });

  } catch (error) {
    console.error('Notification Send Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/register-onesignal
router.post('/register-onesignal', async (req, res) => {
  const { userId, playerId } = req.body;

  if (!userId || !playerId) {
    return res.status(400).json({ error: 'UserId and playerId required' });
  }

  try {
    await DatabaseService.updateUser(userId, { oneSignalPlayerId: playerId });
    res.json({ success: true });
  } catch (error) {
    console.error('OneSignal Register Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/list?userId=...
router.get('/list', async (req, res) => {
  const { userId, limit } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required', data: [] });
  }

  try {
    const parsedLimit = Math.max(1, Math.min(parseInt(limit || '50', 10) || 50, 200));
    const items = await Notification.find({ userId: String(userId) })
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();

    const data = items.map((n) => ({
      id: String(n._id),
      title: n.title,
      body: n.body,
      type: n.type,
      status: n.status,
      route: n.route,
      contentId: n.contentId,
      data: n.data,
      createdAt: n.createdAt
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Notifications List Error:', error);
    res.status(500).json({ success: false, error: error.message, data: [] });
  }
});

// POST /api/notifications/upload-event
router.post('/upload-event', async (req, res) => {
  const {
    userId,
    title,
    body,
    status,
    route,
    contentId,
    type,
    data
  } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ success: false, error: 'userId, title, body required' });
  }

  try {
    const user = await DatabaseService.getUserById(userId);
    const playerId = user?.oneSignalPlayerId;

    const saved = await Notification.create({
      userId: String(userId),
      title: String(title),
      body: String(body),
      type: String(type || 'upload'),
      status: status || 'success',
      route: route || '',
      contentId: contentId || '',
      data: data || {}
    });

    try {
      await sendOneSignalToPlayerId({
        playerId,
        title: String(title),
        body: String(body),
        data: { ...(data || {}), route: route || '', contentId: contentId || '', type: type || 'upload', status: status || 'success' }
      });
    } catch (pushError) {
      console.warn('OneSignal push failed:', pushError?.response?.data || pushError?.message || pushError);
    }

    res.json({ success: true, data: { id: String(saved._id) } });
  } catch (error) {
    console.error('Upload Event Notification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notifications/register-token
// Purpose: Save Push Token for the current user
router.post('/register-token', async (req, res) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    return res.status(400).json({ error: 'UserId and Token required' });
  }

  try {
    await DatabaseService.updateUser(userId, { pushToken: pushToken });
    res.json({ success: true });
  } catch (error) {
    console.error('Notification Register Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
