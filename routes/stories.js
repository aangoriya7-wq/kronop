const express = require('express');
const router = express.Router();

// Story routes for mobile app
router.get('/', async (req, res) => {
  try {
    res.json({ success: true, message: 'Stories endpoint working' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/upload', async (req, res) => {
  try {
    res.json({ success: true, message: 'Story upload endpoint' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
