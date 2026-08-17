// api/get-public-payouts.js
//
// Публичный список последних выплат (обезличенно) — требование п.8
// правил модерации Adsgram: должно быть публичное подтверждение, что
// сервис реально платит пользователям. Без авторизации — доступен
// всем, кто откроет ссылку.

const { supabaseAdmin } = require('../lib/supabaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data: payouts } = await supabaseAdmin
    .from('public_payouts')
    .select('masked_id, amount, paid_at')
    .order('paid_at', { ascending: false })
    .limit(50);

  return res.status(200).json({ payouts: payouts || [] });
};
