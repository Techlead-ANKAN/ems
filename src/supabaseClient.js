import { createClient } from '@supabase/supabase-js'

// These values come from your Supabase project settings.
// 1. Create a .env.local file in the project root.
// 2. Add:
//    VITE_SUPABASE_URL=your_supabase_url
//    VITE_SUPABASE_ANON_KEY=your_anon_key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // This helps you see an error in the browser console if env vars are missing.
  console.warn('Supabase URL or anon key is missing. Check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
