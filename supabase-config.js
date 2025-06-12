// supabase-config.js - Supabase Configuration for GitHub Pages
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wojdlekwvkjibqwipgqr.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvamRsZWt3dmtqaWJxd2lwZ3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2ODE2MTgsImV4cCI6MjA2NTI1NzYxOH0.ie2mA16u7LBo76WrRHLcGRLNSyTt2jE5BglrJs7vBGQ';
//const supabase = createClient(supabaseUrl, supabaseKey)

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
