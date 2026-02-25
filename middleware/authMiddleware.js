const jwt = require('jsonwebtoken');
const supabase = require('../services/supabaseClient');
// const DatabaseService = require('../services/databaseService'); // Service removed

/**
 * Middleware to verify Supabase JWT Token
 * Usage: router.get('/protected-route', verifyToken, (req, res) => { ... });
 */
const verifyToken = async (req, res, next) => {
  try {
    // BYPASS LOGIN: Skip authentication for testing
    req.user = { id: 'guest_user' };
    req.uid = 'guest_user';
    req.userId = 'guest_user';
    
    next();
  } catch (error) {
    console.error('Token Verification Error:', error.message);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware to verify Mongo ID format (simple check to prevent CastErrors)
const validateMongoId = (paramName) => (req, res, next) => {
  const id = req.params[paramName] || req.query[paramName] || req.body[paramName];
  if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: `Invalid ${paramName} format` });
  }
  next();
};

module.exports = {
  verifyToken,
  validateMongoId
};
