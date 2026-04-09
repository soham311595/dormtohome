const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  console.error('SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('SUPABASE_SERVICE_KEY:', supabaseKey ? 'set' : 'MISSING');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

module.exports = { supabase };