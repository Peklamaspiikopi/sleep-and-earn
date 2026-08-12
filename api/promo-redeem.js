// api/promo-redeem.js
//
// Промокоды хранятся в таблице promo_codes в базе, а не в открытом
// JS-файле — их нельзя подсмотреть в исходниках сайта.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, code } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return res.status(400).json({ error: 'Пустой промокод' });

  const { data: promo } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle();

  if (!promo) return res.status(404).json({ error: 'Промокод не найден или неактивен' });

  const { data: existing } = await supabaseAdmin
    .from('promo_redemptions')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('code', normalizedCode)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'Промокод уже был использован' });

  if (promo.max_uses !== null) {
    const { count } = await supabaseAdmin
      .from('promo_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('code', normalizedCode);
    if (count >= promo.max_uses) {
      return res.status(410).json({ error: 'Лимит активаций промокода исчерпан' });
    }
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const newBalance = user.balance + promo.reward;

  await supabaseAdmin.from('users').update({ balance: newBalance }).eq('telegram_id', telegramId);
  await supabaseAdmin.from('promo_redemptions').insert([{ telegram_id: telegramId, code: normalizedCode }]);

  return res.status(200).json({ balance: newBalance, reward: promo.reward });
};
