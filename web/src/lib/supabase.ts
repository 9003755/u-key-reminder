import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In development, we might not have these set yet, but we warn.
  console.warn('Missing Supabase URL or Anon Key. Please check .env.local');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
