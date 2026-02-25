// MongoDB Complete Cleanup Script
// Clears all content data: Reels, Stories, Photos, Videos, Shayari

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';

async function clearMongoDB() {
  console.log('🧹 Starting MongoDB Complete Cleanup...');
  
  const endpoints = [
    '/api/reels/clear',      // Clear all reels
    '/api/stories/clear',    // Clear all stories  
    '/api/photos/clear',     // Clear all photos
    '/api/videos/clear',     // Clear all videos
    '/api/content/clear'     // Clear all content
  ];

  let totalDeleted = 0;
  let errors = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`🗑️ Clearing ${endpoint}...`);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kronop-Cleanup/1.0'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${endpoint}:`, result);
        if (result.deletedCount) {
          totalDeleted += result.deletedCount;
        }
      } else {
        const error = await response.text();
        console.error(`❌ Failed to clear ${endpoint}:`, error);
        errors.push(`${endpoint}: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error clearing ${endpoint}:`, error);
      errors.push(`${endpoint}: ${error.message}`);
    }
  }

  console.log('🧹 MongoDB Cleanup Complete!');
  console.log(`📊 Total Deleted: ${totalDeleted} items`);
  console.log(`❌ Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  return {
    success: errors.length === 0,
    totalDeleted,
    errors,
    timestamp: new Date().toISOString()
  };
}

// Auto-sync verification
async function verifyAutoSync() {
  console.log('🔄 Verifying Auto-Sync System...');
  
  try {
    // Test Bunny Bridge connection
    const testResponse = await fetch(`${API_BASE}/api/content/sync-and-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Auto-Sync System Working:', result);
      return true;
    } else {
      console.log('⚠️ Auto-Sync needs attention');
      return false;
    }
  } catch (error) {
    console.error('❌ Auto-Sync verification failed:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting MongoDB Complete Cleanup & Verification...');
  
  // Step 1: Clear all data
  const cleanupResult = await clearMongoDB();
  
  // Step 2: Verify auto-sync
  const syncWorking = await verifyAutoSync();
  
  console.log('🎯 Final Report:');
  console.log('- Cleanup Success:', cleanupResult.success);
  console.log('- Items Deleted:', cleanupResult.totalDeleted);
  console.log('- Auto-Sync Working:', syncWorking);
  console.log('- Timestamp:', new Date().toISOString());
  
  return {
    cleanup: cleanupResult,
    autoSync: syncWorking
  };
}

// Export for use
module.exports = { clearMongoDB, verifyAutoSync, main };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
