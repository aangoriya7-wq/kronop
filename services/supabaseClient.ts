// ==================== SUPABASE CLIENT ====================
// Supabase client for authentication
// Only used for login/logout, not for data operations

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'
);

export default supabase;
