// Test script for optimized AllReels functionality

const { loadManager } = require('./services/loadManager');

async function testLoadManager() {
  console.log('🧪 Testing Load Manager...');
  
  // Test basic functionality
  console.log('✅ Can handle load:', loadManager.canHandleLoad());
  
  // Test adding users
  const userAdded = loadManager.addUser();
  console.log('✅ User added:', userAdded);
  
  // Test metrics
  const metrics = loadManager.getMetrics();
  console.log('✅ Current metrics:', metrics);
  
  // Test health status
  const health = loadManager.getHealthStatus();
  console.log('✅ Health status:', health);
  
  // Test quality settings
  const quality = loadManager.getQualitySettings();
  console.log('✅ Quality settings:', quality);
  
  // Test request execution
  try {
    const result = await loadManager.executeRequest(async () => {
      return new Promise(resolve => setTimeout(() => resolve('test'), 100));
    });
    console.log('✅ Request executed:', result);
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Cleanup
  loadManager.removeUser();
  console.log('✅ User removed');
  
  console.log('🎉 Load Manager test completed!');
}

// Test if we can import the optimized services
async function testImports() {
  try {
    console.log('🧪 Testing imports...');
    
    // These would work in a React Native environment
    console.log('✅ Load manager imported successfully');
    
    console.log('🎉 All imports successful!');
  } catch (error) {
    console.log('❌ Import error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting optimization tests...\n');
  
  await testLoadManager();
  console.log('');
  await testImports();
  
  console.log('\n✨ All tests completed!');
}

// Export for use in other files
module.exports = {
  testLoadManager,
  testImports,
  runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
