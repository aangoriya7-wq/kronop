const mongoose = require('mongoose');

let isConnecting = false;

// Helper function to validate and fix MongoDB URI for Koyeb
const validateMongoUri = (uri) => {
  if (!uri) return null;
  
  // Check for common URI format issues
  const issues = [];
  
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    issues.push('URI must start with mongodb:// or mongodb+srv://');
  }
  
  if (!uri.includes('@')) {
    issues.push('URI must contain @ after credentials');
  }
  
  if (uri.includes(' ') || uri.includes('\n') || uri.includes('\t')) {
    issues.push('URI contains whitespace characters');
  }
  
  // Check for unescaped special characters in password
  const match = uri.match(/mongodb:\/\/[^:]+:([^@]+)@/);
  if (match && match[1]) {
    const password = match[1];
    const specialChars = ['@', ':', '/', '?', '#', '[', ']', '%'];
    const hasUnescaped = specialChars.some(char => password.includes(char) && !password.includes(char + '%'));
    if (hasUnescaped) {
      issues.push('Password contains unescaped special characters - need URL encoding');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    sanitizedUri: uri.replace(/:([^:@]+)@/, ':***@') // Hide password in logs
  };
};

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MongoDB URI not found in environment variables');
    console.error('🔍 Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
    console.error('🔧 Koyeb Deployment: Check Environment Variables in Koyeb Dashboard');
    throw new Error('MONGODB_URI is not defined - Please set in Koyeb Environment Variables');
  }

  // Validate MongoDB URI for Koyeb deployment
  const validation = validateMongoUri(mongoUri);
  if (!validation.isValid) {
    console.error('❌ MongoDB URI Validation Failed:');
    validation.issues.forEach(issue => console.error(`   • ${issue}`));
    console.error('🔧 Koyeb Solution: Fix MONGODB_URI in Koyeb Environment Variables');
    throw new Error(`MongoDB URI validation failed: ${validation.issues.join(', ')}`);
  }

  console.log('🔗 Connecting to MongoDB...');
  console.log('📍 MongoDB URI:', validation.sanitizedUri); // Hide password in logs
  console.log('🌍 Deployment Environment:', process.env.NODE_ENV || 'development');
  console.log('🔧 Connection Timeout: 30s, Socket Timeout: 45s');

  isConnecting = true;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 10, // Reduced for Koyeb
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 2,  // Reduced for Koyeb
      maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS) || 30000,
      waitQueueTimeoutMS: Number(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS) || 10000,
      retryWrites: true,
      w: 'majority',
      readPreference: 'primaryPreferred'
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log('🎯 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('🔍 Error Name:', error.name);
    console.error('📝 Error Message:', error.message);
    
    // Koyeb-specific error messages
    if (error.name === 'MongoServerSelectionError') {
      console.error('🌐 Koyeb Network Error - Possible causes:');
      console.error('   • MongoDB Atlas IP whitelist (Add Koyeb IP)');
      console.error('   • Network connectivity issues');
      console.error('   • MongoDB cluster down');
      console.error('   • DNS resolution problems');
      console.error('🔧 Solution: Check MongoDB Atlas Network Access');
    } else if (error.name === 'MongoParseError') {
      console.error('📝 MongoDB URI Parse Error - Koyeb Deployment:');
      console.error('   • Invalid MongoDB URI format');
      console.error('   • Special characters in password not URL-encoded');
      console.error('   • Missing @ in connection string');
      console.error('   • Malformed URL parameters');
      console.error('🔧 Koyeb Solution:');
      console.error('   1. Check MONGODB_URI in Koyeb Environment Variables');
      console.error('   2. URL-encode special characters in password');
      console.error('   3. Verify URI format: mongodb://user:pass@host/db');
    } else if (error.code === 'AUTH_FAILED') {
      console.error('🔐 Authentication Failed - Check credentials:');
      console.error('   • Username or password incorrect');
      console.error('   • Special characters in password not URL-encoded');
      console.error('   • User permissions insufficient');
      console.error('🔧 Solution: Update MongoDB credentials in Koyeb');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('🌍 Server Not Reachable - Network issues:');
      console.error('   • MongoDB cluster hostname wrong');
      console.error('   • Firewall blocking connection');
      console.error('   • Koyeb network restrictions');
      console.error('🔧 Solution: Check MongoDB Atlas cluster endpoint');
    } else if (error.message.includes('timeout')) {
      console.error('⏰ Connection Timeout - Network slow:');
      console.error('   • High latency between Koyeb and MongoDB');
      console.error('   • Network congestion');
      console.error('🔧 Solution: Increase timeout values');
    }
    
    throw error;
  } finally {
    isConnecting = false;
  }
};

module.exports = {
  mongoose,
  connectToDatabase
};
