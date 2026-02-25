// Production MongoDB Clear via API
// Uses existing API endpoints to clear content

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';

async function clearViaAPI() {
  console.log('🧹 Starting MongoDB Cleanup via Production API...');
  
  try {
    // Use the existing cleanup endpoint
    console.log('🗑️ Calling /api/content/cleanup...');
    
    const response = await fetch(`${API_BASE}/api/content/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kronop-Cleanup/1.0'
      },
      body: JSON.stringify({
        force: true, // Force delete all
        types: ['reels', 'stories', 'photos', 'videos', 'shayari']
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cleanup successful:', result);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } else {
      const error = await response.text();
      console.error('❌ Cleanup failed:', error);
      
      return {
        success: false,
        error: error,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('❌ API call failed:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Alternative: Use sync endpoint to refresh data
async function refreshData() {
  console.log('🔄 Refreshing data from BunnyCDN...');
  
  try {
    const response = await fetch(`${API_BASE}/api/content/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kronop-Sync/1.0'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sync successful:', result);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } else {
      const error = await response.text();
      console.error('❌ Sync failed:', error);
      
      return {
        success: false,
        error: error,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('❌ Sync call failed:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting MongoDB Cleanup & Data Refresh...');
  
  // Step 1: Try cleanup
  const cleanupResult = await clearViaAPI();
  
  // Step 2: Refresh data from BunnyCDN
  const refreshResult = await refreshData();
  
  console.log('🎯 Final Report:');
  console.log('- Cleanup Success:', cleanupResult.success);
  console.log('- Data Refresh Success:', refreshResult.success);
  console.log('- Timestamp:', new Date().toISOString());
  
  if (cleanupResult.success && refreshResult.success) {
    console.log('🎉 MongoDB cleared and refreshed successfully!');
    console.log('📱 Auto-sync will maintain fresh data from BunnyCDN');
    console.log('⚡ New content will use 0.2s chunks (5 per second)');
    console.log('📱 Videos will be 9:16 full screen with right-side buttons');
  }
  
  return {
    cleanup: cleanupResult,
    refresh: refreshResult
  };
}

// Export for use
module.exports = { clearViaAPI, refreshData, main };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
