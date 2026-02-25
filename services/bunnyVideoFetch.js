// Direct BunnyCDN Video Fetch - Simple and Working
const fetchBunnyCDNVideo = async (bunnyId) => {
  try {
    // Your environment variables
    const PULL_ZONE = process.env.EXPO_PUBLIC_REELS_PULL_ZONE || 'vz-b26a068c-1d9.b-cdn.net';
    const API_KEY = process.env.EXPO_PUBLIC_REELS_API_KEY;
    
    console.log(`🔗 Fetching video: ${bunnyId} from ${PULL_ZONE}`);
    
    // Method 1: Direct CDN URL (if publicly accessible)
    const directUrl = `https://${PULL_ZONE}/${bunnyId}`;
    console.log('📹 Direct URL:', directUrl);
    
    // Method 2: BunnyCDN Stream API
    if (API_KEY) {
      const LIBRARY_ID = process.env.EXPO_PUBLIC_REELS_LIBRARY_ID;
      
      // Get video stream URL from BunnyCDN API
      const streamResponse = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${bunnyId}`, {
        headers: {
          'AccessKey': API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        console.log('✅ BunnyCDN Stream Response:', streamData);
        return streamData.playbackUrl || directUrl;
      }
    }
    
    return directUrl;
    
  } catch (error) {
    console.error('❌ BunnyCDN fetch error:', error);
    return null;
  }
};

// Test function
const testBunnyCDN = async () => {
  const testVideoId = 'sample-video-123'; // Replace with real bunny_id
  
  console.log('🚀 Testing BunnyCDN Video Fetch...');
  
  const videoUrl = await fetchBunnyCDNVideo(testVideoId);
  
  if (videoUrl) {
    console.log('✅ Success! Video URL:', videoUrl);
    
    // Test if video is accessible
    const videoTest = await fetch(videoUrl, { method: 'HEAD' });
    console.log('📊 Video Status:', videoTest.status, videoTest.ok ? '✅ Accessible' : '❌ Not Accessible');
  } else {
    console.log('❌ Failed to get video URL');
  }
};

// Export for use in components
module.exports = { fetchBunnyCDNVideo, testBunnyCDN };
