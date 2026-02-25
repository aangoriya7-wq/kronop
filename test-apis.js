#!/usr/bin/env node

// ==================== API TESTING SCRIPT ====================
// Test all Kronop API endpoints with real .env configuration

require('dotenv').config();
const axios = require('axios');

// Get base URL from environment
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

console.log('🧪 Testing Kronop APIs at:', API_BASE);
console.log('📝 Using Environment Configuration:');
console.log('   MongoDB:', process.env.EXPO_PUBLIC_MONGODB_URI || process.env.MONGODB_URI ? '✅ Connected' : '❌ Missing');
console.log('   BunnyCDN:', process.env.EXPO_PUBLIC_BUNNY_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('   Supabase:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing');
console.log('   OneSignal:', process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ? '✅ Configured' : '❌ Missing');
console.log('');

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to test endpoints
async function testEndpoint(method, endpoint, data = null, description = '') {
  testResults.total++;
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      timeout: 10000
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    testResults.passed++;
    
    console.log(`✅ ${description || endpoint} - ${response.status} (${response.data?.success ? 'SUCCESS' : 'DATA'})`);
    testResults.details.push({
      endpoint,
      method,
      status: response.status,
      success: true,
      response: response.data
    });
    
    return response.data;
  } catch (error) {
    testResults.failed++;
    
    const status = error.response?.status || 'NETWORK';
    const message = error.response?.data?.error || error.message;
    
    console.log(`❌ ${description || endpoint} - ${status} (${message})`);
    testResults.details.push({
      endpoint,
      method,
      status,
      success: false,
      error: message
    });
    
    return null;
  }
}

// ==================== MAIN TEST FUNCTION ====================
async function runTests() {
  console.log('🚀 Starting API Tests...\n');

  // Test Content APIs
  console.log('📺 Testing Content APIs...');
  await testEndpoint('GET', '/content', null, 'Get All Content');
  await testEndpoint('GET', '/content/reels', null, 'Get Reels');
  await testEndpoint('GET', '/content/video', null, 'Get Videos');
  await testEndpoint('GET', '/content/live', null, 'Get Live Streams');
  await testEndpoint('GET', '/content/photo', null, 'Get Photos');
  await testEndpoint('GET', '/content/story', null, 'Get Stories');
  await testEndpoint('GET', '/content/sync/status', null, 'Sync Status');
  
  // Test User APIs
  console.log('\n👤 Testing User APIs...');
  await testEndpoint('GET', '/users/profile', null, 'Get Profile');
  await testEndpoint('POST', '/users/sync', { userId: 'test_user' }, 'Sync User');
  
  // Test Auth APIs
  console.log('\n🔐 Testing Auth APIs...');
  await testEndpoint('POST', '/auth/login', { 
    email: 'test@example.com', 
    password: 'test123' 
  }, 'Login Test');
  
  // Test Notification APIs
  console.log('\n🔔 Testing Notification APIs...');
  await testEndpoint('POST', '/notifications/register-token', {
    userId: 'test_user',
    pushToken: 'test_token_123'
  }, 'Register Push Token');
  
  // Test Special Endpoints
  console.log('\n⭐ Testing Special Endpoints...');
  await testEndpoint('GET', '/shayari/random', null, 'Random Shayari');
  await testEndpoint('GET', '/frontend/all', null, 'Frontend All Content');
  
  // Test BunnyCDN Integration
  console.log('\n🐰 Testing BunnyCDN Integration...');
  const syncResult = await testEndpoint('POST', '/content/sync', null, 'BunnyCDN Sync');
  
  if (syncResult && syncResult.success) {
    const totalItems = syncResult.data?.totalItems || 0;
    console.log(`   📊 Synced ${totalItems} items from BunnyCDN`);
  }

  // ==================== RESULTS SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Show failed tests details
  const failedTests = testResults.details.filter(t => !t.success);
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - ${test.status}: ${test.error}`);
    });
  }
  
  // Environment Configuration Summary
  console.log('\n' + '='.repeat(60));
  console.log('🌍 ENVIRONMENT CONFIGURATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`🔗 API Base URL: ${API_BASE}`);
  console.log(`📊 MongoDB: ${process.env.EXPO_PUBLIC_MONGODB_URI || process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🐰 BunnyCDN API Key: ${process.env.EXPO_PUBLIC_BUNNY_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`📹 BunnyCDN Libraries: ${process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🗄️ Supabase: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔔 OneSignal: ${process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🤖 Groq AI: ${process.env.EXPO_PUBLIC_GROQ_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔍 Google Search: ${process.env.EXPO_PUBLIC_GOOGLE_SEARCH_KEY ? '✅ Configured' : '❌ Missing'}`);
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. If any tests failed, check the corresponding service configuration');
  console.log('2. Verify all environment variables are properly set in Koyeb');
  console.log('3. Test frontend connectivity with the backend APIs');
  console.log('4. Monitor BunnyCDN sync status for content updates');
  
  console.log('\n✅ API Testing Complete!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testEndpoint, runTests };
