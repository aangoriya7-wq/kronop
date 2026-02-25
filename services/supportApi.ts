// ==================== SUPPORT/UNSUPPORT API ====================
// Real support/unsupport functionality with server backend
import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

export interface SupportStats {
  supporters: number; // People who support this user
  supporting: number; // People this user supports
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Support a user - Server implementation
 */
export const supportUser = async (targetUserId: string, currentUserId: string): Promise<ApiResponse<void>> => {
  try {
    if (!currentUserId || currentUserId === targetUserId) {
      return { data: null, error: 'Invalid user' };
    }
    await fetch(`${API_URL}/support/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, currentUserId })
    }).catch(() => {});
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

/**
 * Unsupport a user - Server implementation
 */
export const unsupportUser = async (targetUserId: string, currentUserId: string): Promise<ApiResponse<void>> => {
  try {
    if (!currentUserId) {
      return { data: null, error: 'Invalid user' };
    }
    await fetch(`${API_URL}/support/unsupport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, currentUserId })
    }).catch(() => {});
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

/**
 * Check if current user supports target user
 */
export const checkSupportStatus = async (targetUserId: string, currentUserId: string): Promise<ApiResponse<boolean>> => {
  try {
    if (!currentUserId) {
      return { data: false, error: null };
    }
    const res = await fetch(`${API_URL}/support/status?${new URLSearchParams({ targetUserId, currentUserId })}`).catch(() => null);
    const data = res ? await res.json() : { supported: false };
    return { data: !!data.supported, error: null };
  } catch (error: any) {
    return { data: false, error: error.message };
  }
};

/**
 * Get support stats for a user (supporters count + supporting count)
 */
export const getSupportStats = async (userId?: string, currentUserId?: string): Promise<ApiResponse<SupportStats>> => {
  try {
    const targetUserId = userId || currentUserId;
    if (!targetUserId) {
      return { data: null, error: 'User not found' };
    }
    const res = await fetch(`${API_URL}/support/stats?${new URLSearchParams({ userId: targetUserId })}`).catch(() => null);
    const json = res ? await res.json() : { supporters: 0, supporting: 0 };
    return { data: { supporters: json.supporters || 0, supporting: json.supporting || 0 }, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

/**
 * Get list of supporters (people who support this user)
 */
export const getSupporters = async (userId?: string, currentUserId?: string): Promise<ApiResponse<any[]>> => {
  try {
    const targetUserId = userId || currentUserId;

    if (!targetUserId) {
      return { data: null, error: 'User not found' };
    }
    const res = await fetch(`${API_URL}/support/list?supported=${targetUserId}`).catch(() => null);
    const json = res ? await res.json() : [];
    return { data: Array.isArray(json) ? json : [], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

/**
 * Get list of users this user supports
 */
export const getSupporting = async (userId?: string, currentUserId?: string): Promise<ApiResponse<any[]>> => {
  try {
    const targetUserId = userId || currentUserId;

    if (!targetUserId) {
      return { data: null, error: 'User not found' };
    }
    const res = await fetch(`${API_URL}/support/list?supporter=${targetUserId}`).catch(() => null);
    const json = res ? await res.json() : [];
    return { data: Array.isArray(json) ? json : [], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const supportApi = {
  supportUser,
  unsupportUser,
  checkSupportStatus,
  getSupportStats,
  getSupporters,
  getSupporting,
};
