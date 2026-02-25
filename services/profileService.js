// Clean Profile Service - Only Core Functions
// Direct connection to BASE_URL from .env

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';
const CURRENT_USER_ID = 'guest_user';

class ProfileService {
  // Fetch user profile - direct call
  async fetchProfile(userId = CURRENT_USER_ID) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else if (response.status === 404) {
        return { success: false, error: 'Profile not found' };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Fetch Profile Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Update user profile - direct call
  async updateProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${CURRENT_USER_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Update Profile Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const profileService = new ProfileService();

module.exports = profileService;
