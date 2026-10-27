import { createClient } from '@supabase/supabase-js';

// Ambil URL dan Key dari environment
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Sanitasi otomatis: bersihkan akhiran /rest/v1 atau garis miring di akhir URL
// Supabase JS memerlukan host murni: https://[project-id].supabase.co
const cleanUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

export const supabase = createClient(cleanUrl, rawKey);