// lib/supabaseAdmin.js
//
// Этот клиент использует SERVICE ROLE ключ — он обходит RLS и может
// писать что угодно. Поэтому он существует ТОЛЬКО в серверном коде
// (папка /api), никогда не должен попасть в script.js или в браузер.

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabaseAdmin };
