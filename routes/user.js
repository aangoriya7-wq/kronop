const express = require('express');
const multer = require('multer');
const router = express.Router();
const userController = require('../controllers/userController');

// Configure multer for user uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// GET /users/profile
router.get('/profile', userController.getProfile);

// POST /users/profile
router.post('/profile', userController.saveProfile);

// POST /users/upload-image
router.post('/upload-image', upload.single('image'), userController.uploadImage);

module.exports = router;
