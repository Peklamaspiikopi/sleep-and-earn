// api/get-history.js
//
// Возвращает последние операции по балансу (для вкладки "История").

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, offset } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const start = Number(offset) || 0;
  const PAGE_SIZE = 20;

  const { data: rows, error } = await supabaseAdmin
    .from('transactions')
    .select('type, amount, balance_after, meta, created_at')
    .eq('telegram_id', auth.telegramId)
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  if (error) return res.status(500).json({ error: 'Не удалось получить историю' });

  return res.status(200).json({ items: rows || [], hasMore: (rows || []).length === PAGE_SIZE });
};
