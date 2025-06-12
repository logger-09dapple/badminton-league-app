// supabase-config.js - Supabase Configuration for GitHub Pages
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wojdlekwvkjibqwipgqr.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);